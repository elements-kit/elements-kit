import { isFragmentComponent } from "../jsx-runtime/fragment";
import type { JSX } from "../jsx-runtime";
import { isForComponent } from "../for";
import { isReactive, resolveProps, untracked } from "../signals";
import {
  AttrAliases,
  BooleanAttributes,
  ChildProperties,
  Properties,
} from "../jsx-runtime/constants";
import { isReactivePromiseLike } from "../utilities/promise";
import { isAsyncLike } from "../utilities/async";
import { escapeAttr, escapeHtml } from "./escape";

/**
 * Server output node. Nested jsx calls return `SNode`s so the children walk
 * can distinguish pre-rendered markup (spliced verbatim) from user strings
 * (escaped).
 */
export class SNode {
  constructor(public chunks: Chunk[]) {}
}

/**
 * An async insertion point. The stream awaits it in document order and
 * assigns its serialization id at emit time — ids must follow document
 * order (not jsx-evaluation order, which is children-first) so the hydrate
 * walk, which runs in document order, aligns with them.
 */
export class AsyncChunk {
  constructor(readonly instance: PromiseLike<unknown>) {}
}

export type Chunk = string | SNode | AsyncChunk;

/** Normalize an arbitrary resolved value into chunks (used by the stream). */
export function resolveChildChunks(value: unknown): Chunk[] {
  return child(value);
}

// Markers mirror the client runtime exactly: Slot's comment pair
// (src/slot.ts) and For's range/entry comments (src/for.ts). The hydrate
// claim walker matches on these strings.
const SLOT_OPEN = "<!--{-->";
const SLOT_CLOSE = "<!--}-->";
const FOR_OPEN = "<!--<For>-->";
const FOR_CLOSE = "<!--</For>-->";

const VoidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

// IDL property names whose attribute form is not just the lowercased key.
// `null` means the property has no attribute representation — skip it.
const PropertyAttrAliases: Record<string, string | null> = {
  className: "class",
  defaultValue: "value",
  defaultChecked: "checked",
  defaultSelected: "selected",
  defaultMuted: "muted",
  indeterminate: null,
};

export function serverJsx(
  type: JSX.ElementType,
  props: Record<string, unknown>,
): SNode {
  if (typeof type === "string") return element(type, props);
  if (isFragmentComponent(type)) {
    if ((props as { html?: boolean }).html) {
      // Raw-HTML region: emitted unescaped between Slot markers (the claim
      // walk adopts the region). Sanitization is the caller's duty.
      const source = props.children as unknown;
      const value =
        typeof source === "function"
          ? untracked(source as () => unknown)
          : source;
      return new SNode([
        SLOT_OPEN,
        value == null ? "" : String(value),
        SLOT_CLOSE,
      ]);
    }
    return new SNode(childList(props.children));
  }
  if (isForComponent(type)) return forElement(props);
  if (typeof type === "function" && !type.prototype?.render) {
    const toGetterProps = resolveProps as unknown as (
      raw: object,
    ) => Record<string, unknown>;
    const call = type as unknown as (props: Record<string, unknown>) => unknown;
    const result = call(toGetterProps(props));
    return new SNode(child(result));
  }
  const name =
    typeof type === "function" ? (type.name ?? "anonymous") : String(type);
  throw new Error(
    `Server rendering does not support class components ("${name}"); v1 supports intrinsic elements, function components, Fragment and For.`,
  );
}

// ─ Elements ───────────────────────────────────────────────────────────────────

function element(tag: string, props: Record<string, unknown>): SNode {
  let attrs = "";
  let classBase: string | undefined;
  const classToggles: string[] = [];
  let styleBase: string | undefined;
  const styleEntries: string[] = [];
  let childrenValue: unknown;
  let textValue: unknown;

  for (const [key, rawValue] of Object.entries(props)) {
    if (key === "children") {
      childrenValue = rawValue;
      continue;
    }
    if (key === "ref") continue;

    const colonIdx = key.indexOf(":");
    const ns = colonIdx > 0 ? key.slice(0, colonIdx) : "";
    if (ns === "on") continue;

    const value = isReactive(rawValue as never)
      ? untracked(rawValue as () => unknown)
      : rawValue;

    if (ns) {
      const name = key.slice(colonIdx + 1);
      if (ns === "prop") continue;
      if (ns === "class") {
        if (value) classToggles.push(name);
        continue;
      }
      if (ns === "style") {
        if (value != null && value !== false)
          styleEntries.push(`${name}:${String(value)}`);
        continue;
      }
      if (ns === "xlink" || ns === "xml") {
        attrs += attr(key, value);
        continue;
      }
    }

    if (key === "class") {
      classBase = value == null ? undefined : String(value);
      continue;
    }
    if (key === "style") {
      styleBase = styleToString(value);
      continue;
    }
    if (ChildProperties.has(key)) {
      if (key === "innerHTML") {
        throw new Error(
          "innerHTML is not supported in server rendering — there is no raw HTML sink.",
        );
      }
      textValue = value; // textContent / innerText
      continue;
    }
    if (Properties.has(key)) {
      const alias = PropertyAttrAliases[key];
      if (alias === null) continue;
      if (alias === "class") {
        // Merge with `class` / `class:` handling — avoids a duplicate attribute.
        classBase = value == null ? undefined : String(value);
        continue;
      }
      attrs += attr(alias ?? key.toLowerCase(), value);
      continue;
    }
    attrs += attr(AttrAliases[key] ?? key, value);
  }

  const classes = [
    ...(classBase !== undefined && classBase !== "" ? [classBase] : []),
    ...classToggles,
  ];
  if (classBase !== undefined || classToggles.length > 0) {
    attrs += attr("class", classes.join(" "));
  }
  const styles = [...(styleBase ? [styleBase] : []), ...styleEntries];
  if (styles.length > 0) attrs += attr("style", styles.join(";"));

  const open = `<${tag}${attrs}>`;
  if (VoidElements.has(tag)) return new SNode([open]);

  const kids =
    textValue != null
      ? [escapeHtml(String(textValue))]
      : childList(childrenValue);
  return new SNode([open, ...kids, `</${tag}>`]);
}

function attr(name: string, value: unknown): string {
  // Boolean content attributes: presence = true. Truthy of any type emits
  // bare; falsy omits — never `disabled="0"`.
  if (BooleanAttributes.has(name)) return value ? ` ${name}` : "";
  if (value == null || value === false) return "";
  if (value === true || value === "") return ` ${name}`;
  return ` ${name}="${escapeAttr(String(value))}"`;
}

function styleToString(value: unknown): string | undefined {
  if (value == null || value === false) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== false)
      .map(
        ([k, v]) =>
          `${k.includes("-") ? k : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${String(v)}`,
      )
      .join(";");
  }
  return String(value);
}

// ─ Children ───────────────────────────────────────────────────────────────────

function childList(raw: unknown): Chunk[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return (raw as unknown[]).flat(Infinity).flatMap(child);
  }
  return child(raw);
}

function child(c: unknown): Chunk[] {
  if (c == null || typeof c === "boolean") return [];
  if (c instanceof SNode) return [c];
  if (isReactivePromiseLike(c) || isAsyncLike(c)) {
    return asyncChild(c as unknown as PromiseLike<unknown>);
  }
  if (typeof c === "function") {
    // Dynamic child (signal, computed or `() => T`): snapshot once, wrap in
    // Slot-compatible markers so the hydrate walker finds the live region.
    const value = untracked(c as () => unknown);
    return [SLOT_OPEN, ...child(value), SLOT_CLOSE];
  }
  if (typeof c === "string") return [escapeHtml(c)];
  if (typeof c === "number" || typeof c === "bigint") return [String(c)];
  if (Array.isArray(c)) return (c as unknown[]).flat(Infinity).flatMap(child);
  return [escapeHtml(String(c))];
}

function asyncChild(p: PromiseLike<unknown>): Chunk[] {
  // Fulfilled instances await instantly; rejected ones reject the stream.
  return [SLOT_OPEN, new AsyncChunk(p), SLOT_CLOSE];
}

// ─ For ────────────────────────────────────────────────────────────────────────

function forElement(props: Record<string, unknown>): SNode {
  const each = props.each;
  const items = untracked(() =>
    typeof each === "function" ? (each as () => unknown[])() : each,
  ) as unknown[];
  const by =
    (props.by as (item: unknown, index: number) => string | number) ??
    ((_item: unknown, index: number) => index);
  const render = props.children as (item: unknown, index: number) => unknown;

  const chunks: Chunk[] = [FOR_OPEN];
  (items ?? []).forEach((item, index) => {
    // Encoded so a hostile key can't terminate the marker comment (`-->`)
    // or fake an entry boundary (`]`). Digit/word keys pass through
    // unchanged; the claim walk compares encoded forms.
    const key = encodeURIComponent(String(by(item, index)));
    chunks.push(
      `<!--[${key}]-->`,
      ...child(render(item, index)),
      `<!--[/${key}]-->`,
    );
  });
  chunks.push(FOR_CLOSE);
  return new SNode(chunks);
}
