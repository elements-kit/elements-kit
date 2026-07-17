import { effect, isReactive } from "../signals";
import { on } from "../utilities/event-listener.ts";
import {
  ChildProperties,
  Properties,
  ReservedNameSpaces,
  svgNamespace,
} from "./constants";
import { applyChildren, Children, isChildrenProperty } from "./children";
import * as CSS from "csstype";
import { JSX } from "elements-kit/jsx-runtime";

/** A resolved runtime node — what `applyProps` / `applyChildren` operate on. */
export type PropsTarget = JSX.Element | JSX.ElementClass;

// ─ JSX namespaces — extras layered onto every intrinsic element ─────────────
interface CSSProperties extends CSS.PropertiesHyphen {
  [key: `-${string}`]: string | number | undefined;
}

type CssStyleKey =
  Extract<keyof CSSProperties, string> extends infer K
    ? K extends `-${string}`
      ? never
      : K
    : never;

type StyleNamespace = {
  [K in CssStyleKey as `style:${K}`]?: CSSProperties[K] | null;
};

type PropNamespace<E> = {
  [K in keyof E as K extends string ? `prop:${K}` : never]?: E[K];
};

/**
 * Maps slot names to `Child` content.
 * Use this to type `slot:name` JSX props on a custom component.
 *
 * @example
 * ```tsx
 * function Card(props: { title: string } & SlotProps<"header" | "footer">) { … }
 * // caller: <Card title="…" slot:header={<h1>…</h1>} slot:footer={<p>…</p>} />
 * ```
 */
export type SlotProps<K extends string> = {
  [P in K as `slot:${P}`]?: Children;
};
type XlinkAttrs = {
  "xlink:href"?: string | undefined;
  "xlink:title"?: string | undefined;
  "xlink:show"?: "new" | "replace" | "embed" | "other" | "none" | undefined;
  "xlink:role"?: string | undefined;
  "xlink:type"?:
    | "simple"
    | "extended"
    | "locator"
    | "arc"
    | "resource"
    | "title"
    | undefined;
  "xlink:arcrole"?: string | undefined;
  "xlink:actuate"?: "onLoad" | "onRequest" | "other" | "none" | undefined;
};

type ClassNamespace = {
  [K in `class:${string}`]?: boolean;
};
type XmlAttrs = {
  "xml:lang"?: string | undefined;
  "xml:space"?: "default" | "preserve" | undefined;
  "xml:base"?: string | undefined;
};

// SVG-only namespaced attributes. The runtime routes any `xlink:*` / `xml:*`
// key through `setAttributeNS` (see `applyProps` below), but spec-wise these
// only apply to SVG content — so the types are only intersected onto
// IntrinsicElements whose concrete element type extends SVGElement.
export type SvgNamespaceAttrs = XlinkAttrs & XmlAttrs;

/**
 * Namespaced JSX props added by elements-kit on top of dom-expressions.
 * All three are tag-aware via the element type `E`. Values here are plain —
 * `JSX.IntrinsicElements` wraps them in `MaybeReactive` afterwards.
 *
 * - `class:foo` — `boolean`. Class names are user-defined CSS so the key
 *   stays open (no autocomplete possible).
 * - `style:cssProp` — keys mapped from csstype's hyphenated property names
 *   for autocomplete; value typed per-property.
 * - `prop:K` — inferred from `keyof E`. On `<div>` exposes
 *   `prop:className`, `prop:id`, etc. (from `HTMLDivElement`); on a
 *   registered custom element exposes its public fields too.
 *
 * `ref` and `slot:foo` are NOT here — `ref` is declared directly by
 * `JSX.IntrinsicElements` (called once, never reactive), and `slot:foo` is
 * emitted per-element via `SlotsOf<C>` only for elements that declare
 * `[SLOTS]`. Plain HTML intrinsics don't accept slot props (the runtime
 * ignores them).
 */
// Object form of the `style` ATTRIBUTE is applied with
// `Object.assign(el.style, value)` (see `applyStyle`) — CSSStyleDeclaration
// fields are camelCase, so the object type is csstype's camelCase
// `Properties` (hyphenated keys would silently no-op). The `style:prop`
// NAMESPACE goes through `setProperty` instead, hence hyphenated keys there.
interface StyleAttrObject extends CSS.Properties {}

// Style props only exist on elements that carry inline style —
// `ElementCSSInlineStyle` is the DOM interface providing `.style`
// (HTML/SVG/MathML). A bare `Element` gets neither form.
type JsxNamespaces<E extends Element = Element> =
  (E extends ElementCSSInlineStyle
    ? { style?: string | StyleAttrObject } & StyleNamespace
    : {}) &
    PropNamespace<Omit<E, "children">> &
    ClassNamespace;

type JsxNamespaceKeys =
  | "style"
  | `class:${string}`
  | `style:${string}`
  | `prop:${string}`;

export type WithJsxNamespaces<T, E extends Element = Element> = Omit<
  T,
  JsxNamespaceKeys
> &
  JsxNamespaces<E>;

export function applyProps(
  node: PropsTarget,
  props: Record<string, unknown>,
): void {
  const entries = Object.entries(props);
  if (entries.length === 0) return;
  for (const [key, value] of entries) {
    // ─ Children (slot:name, Slot properties) ──────────────────────────────────
    if (isChildrenProperty(node, key)) {
      applyChildren(node, key, value as Children);
      continue;
    }

    // ─ Single namespace split: shared by event + setProp paths ───────────────
    const colonIdx = key.indexOf(":");
    const ns = colonIdx > 0 ? key.slice(0, colonIdx) : "";

    if (ns === "on") {
      const evName = key.slice(colonIdx + 1);
      if (isReactive(value)) {
        effect(() => {
          on(node as EventTarget, evName, value() as EventListener);
        });
      } else {
        on(node as EventTarget, evName, value as EventListener);
      }
      continue;
    }

    if (isReactive(value)) {
      effect(() => setProp(node, key, value()));
      continue;
    }

    setProp(node, key, value);
  }
}

function setProp(node: PropsTarget, key: string, value: unknown): void {
  // ─ Namespaced keys ────────────────────────────────────────────────────────
  const colonIdx = key.indexOf(":");
  if (colonIdx > -1) {
    const ns = key.slice(0, colonIdx);
    const name = key.slice(colonIdx + 1);

    if (ReservedNameSpaces.has(ns)) {
      if (ns === "prop") {
        (node as unknown as Record<string, unknown>)[name] = value;
        return;
      }
      if (ns === "class") {
        (node as HTMLElement).classList.toggle(name, Boolean(value));
        return;
      }
      if (ns === "style") {
        if (value == null || value === false)
          (node as HTMLElement).style.removeProperty(name);
        else (node as HTMLElement).style.setProperty(name, String(value));
        return;
      }
      // "on" namespace: handled above by isEventKey
      return;
    }

    // SVG namespaced attributes (xlink:href, xml:lang, …)
    const svgNs = svgNamespace(ns);
    if (svgNs) {
      (node as Element).setAttributeNS(svgNs, key, String(value ?? ""));
      return;
    }
  }

  // ─ Special props ──────────────────────────────────────────────────────────
  if (key === "class") {
    (node as HTMLElement).className = String(value ?? "");
    return;
  }
  if (key === "style") {
    applyStyle(node as Element, value);
    return;
  }

  // ─ ChildProperties: innerHTML, textContent, innerText ────────────────────
  if (ChildProperties.has(key)) {
    (node as unknown as Record<string, unknown>)[key] = value ?? "";
    return;
  }

  // ─ Properties: value, checked, selected, muted, defaultValue, … ─────────
  if (!(node instanceof SVGElement) && Properties.has(key)) {
    (node as unknown as Record<string, unknown>)[key] = value;
    return;
  }

  // ─ Custom element own properties ─────────────────────────────────────────
  if (node instanceof Element && node.nodeName.includes("-") && key in node) {
    try {
      (node as unknown as Record<string, unknown>)[key] = value;
    } catch {
      setAttribute(node, key, value);
    }
    return;
  }

  // ─ Plain class component: set as property ────────────────────────────────
  if (!(node instanceof Element)) {
    (node as unknown as Record<string, unknown>)[key] = value;
    return;
  }

  // ─ Default: setAttribute ─────────────────────────────────────────────────
  setAttribute(node, key, value);
}

function applyStyle(el: Element, value: unknown): void {
  const s = (el as HTMLElement).style;
  if (!s) return;
  if (typeof value === "string") s.cssText = value;
  else if (value && typeof value === "object") Object.assign(s, value);
}

function setAttribute(el: Element, key: string, value: unknown): void {
  if (value == null || value === false) {
    if (el.hasAttribute(key)) el.removeAttribute(key);
    return;
  }
  const next = value === true ? "" : String(value);
  if (el.getAttribute(key) === next) return;
  el.setAttribute(key, next);
}
