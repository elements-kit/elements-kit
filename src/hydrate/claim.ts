import { Fragment, isFragmentComponent } from "../jsx-runtime/fragment";
import { For, isForComponent, type Entry } from "../for";
import { createElement } from "../jsx-runtime/element";
import { setRenderer, type Renderer } from "../jsx-runtime/renderer";
import { applyProps } from "../jsx-runtime/properties";
import { resolveChild } from "../jsx-runtime/children";
import { Slot } from "../slot";
import {
  CLAIM,
  effect,
  effectScope,
  isReactive,
  onCleanup,
  resolveProps,
  untracked,
} from "../signals";
import { ASYNC_REGION } from "../signals/lib";
import type { AsyncRegionMeta } from "../await";
import { isReactivePromiseLike } from "../utilities/promise";
import { isAsyncLike } from "../utilities/async";
import { parseHtml } from "../jsx-runtime/fragment";

export interface MismatchInfo {
  expected: string;
  found: Node | null;
}
export type OnMismatch = (info: MismatchInfo) => void;

/** Parsed ek-data payload: document-order id → serialized server value. */
export type HydrationData = Record<string, { value: unknown }>;

interface HydrationContext {
  /** Walk-order async counter — mirrors the server's emit-order ids. */
  counter: number;
  data: HydrationData | null;
}

let hydrationContext: HydrationContext | null = null;

export function setHydrationContext(
  ctx: HydrationContext | null,
): HydrationContext | null {
  const prev = hydrationContext;
  hydrationContext = ctx;
  return prev;
}

// ─ VNodes ─────────────────────────────────────────────────────────────────────
// JSX evaluates children-first, so the claim renderer cannot walk the DOM
// during evaluation. It returns lightweight descriptors instead; the walk
// phase then claims the DOM top-down.

const VNODE = Symbol.for("elements-kit.vnode");

interface ElVNode {
  [VNODE]: true;
  kind: "el";
  tag: string;
  props: Record<string, unknown>;
}
interface FragVNode {
  [VNODE]: true;
  kind: "frag";
  children: unknown;
  html?: boolean;
}
interface ForVNode {
  [VNODE]: true;
  kind: "for";
  props: Record<string, unknown>;
}
type VNode = ElVNode | FragVNode | ForVNode;

function isVNode(value: unknown): value is VNode {
  return typeof value === "object" && value !== null && VNODE in value;
}

export const claimRenderer: Renderer = {
  jsx(type, props): unknown {
    if (typeof type === "string") {
      return { [VNODE]: true, kind: "el", tag: type, props } as ElVNode;
    }
    if (isFragmentComponent(type)) {
      return {
        [VNODE]: true,
        kind: "frag",
        children: props.children,
        html: (props as { html?: boolean }).html === true,
      } as FragVNode;
    }
    if (isForComponent(type)) {
      return { [VNODE]: true, kind: "for", props } as ForVNode;
    }
    if (typeof type === "function" && !type.prototype?.render) {
      const toGetterProps = resolveProps as unknown as (
        raw: object,
      ) => Record<string, unknown>;
      const call = type as unknown as (
        props: Record<string, unknown>,
      ) => unknown;
      return call(toGetterProps(props));
    }
    const name =
      typeof type === "function" ? (type.name ?? "anonymous") : String(type);
    throw new Error(
      `Hydration does not support class components ("${name}"); v1 supports intrinsic elements, function components, Fragment and For.`,
    );
  },
};

function withClaimRenderer<T>(fn: () => T): T {
  setRenderer(claimRenderer);
  try {
    return fn();
  } finally {
    setRenderer(null);
  }
}

// ─ Walk ───────────────────────────────────────────────────────────────────────

interface Cursor {
  node: ChildNode | null;
  parent: Node;
}

/** Claim `container`'s existing children against the evaluated tree. */
export function claimChildren(
  container: Element,
  root: unknown,
  onMismatch?: OnMismatch,
): void {
  const cursor: Cursor = { node: container.firstChild, parent: container };
  walkList(cursor, root, onMismatch);
  // Leftover nodes (e.g. the ek-data script tag) stay in place untouched.
}

function walkList(cur: Cursor, raw: unknown, om?: OnMismatch): void {
  if (raw == null || typeof raw === "boolean") return;
  if (Array.isArray(raw)) {
    for (const c of (raw as unknown[]).flat(Infinity)) walkChild(cur, c, om);
    return;
  }
  walkChild(cur, raw, om);
}

function walkChild(cur: Cursor, c: unknown, om?: OnMismatch): void {
  if (c == null || typeof c === "boolean") return;
  if (isVNode(c)) {
    if (c.kind === "frag") {
      if (c.html) return claimRawRegion(cur, c.children, om);
      return walkList(cur, c.children, om);
    }
    if (c.kind === "for") return claimFor(cur, c, om);
    return claimElement(cur, c, om);
  }
  if (isReactivePromiseLike(c) || isAsyncLike(c)) {
    return claimAsync(cur, c as unknown as AsyncLike, om);
  }
  if (typeof c === "function") {
    return claimDynamic(cur, c as () => unknown, om);
  }
  if (c instanceof Node) {
    // A pre-built DOM node can't be matched against server HTML — treat it
    // as a mismatch and splice the node itself in.
    return fallback(cur, om, c.nodeName, () => c);
  }
  claimText(cur, String(c), om);
}

// ─ Text ───────────────────────────────────────────────────────────────────────

function claimText(cur: Cursor, text: string, om?: OnMismatch): void {
  if (text === "") return;
  const node = cur.node;
  if (node && node.nodeType === Node.TEXT_NODE) {
    const data = (node as Text).data;
    if (data === text) {
      cur.node = node.nextSibling;
      return;
    }
    if (data.startsWith(text)) {
      // Adjacent JSX text children merge into one server text node — split it
      // so each child claims its own segment.
      (node as Text).splitText(text.length);
      cur.node = node.nextSibling;
      return;
    }
  }
  fallback(cur, om, text, () => document.createTextNode(text));
}

// ─ Elements ───────────────────────────────────────────────────────────────────

function claimElement(cur: Cursor, v: ElVNode, om?: OnMismatch): void {
  const node = cur.node;
  const matches =
    node !== null &&
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).localName.toLowerCase() === v.tag.toLowerCase();

  if (!matches) {
    fallback(cur, om, `<${v.tag}>`, () => buildVNode(v));
    return;
  }

  const el = node as Element;
  const { ref, children, live } = splitProps(v.props);
  if (live) applyProps(el as never, live);
  claimChildren(el, children, om);
  if (typeof ref === "function") (ref as (e: Element) => void)(el);
  cur.node = el.nextSibling;
}

/**
 * Split claimed-element props: static values are already in the server HTML
 * and are skipped; `on:` handlers, reactive values and `prop:` assignments
 * still need to run — they route through the normal `applyProps` path.
 */
function splitProps(props: Record<string, unknown>): {
  ref: unknown;
  children: unknown;
  live: Record<string, unknown> | null;
} {
  let ref: unknown;
  let children: unknown;
  let live: Record<string, unknown> | null = null;
  for (const [key, value] of Object.entries(props)) {
    if (key === "children") {
      children = value;
      continue;
    }
    if (key === "ref") {
      ref = value;
      continue;
    }
    if (key === "innerHTML") {
      throw new Error(
        "innerHTML is not supported in hydration — there is no raw HTML sink.",
      );
    }
    const colonIdx = key.indexOf(":");
    const ns = colonIdx > 0 ? key.slice(0, colonIdx) : "";
    if (ns === "on" || ns === "prop" || isReactive(value as never)) {
      (live ??= {})[key] = value;
    }
  }
  return { ref, children, live };
}

// ─ Dynamic children (slot markers) ────────────────────────────────────────────

function claimDynamic(
  cur: Cursor,
  getter: () => unknown,
  om?: OnMismatch,
): void {
  // Await boundaries rendered as async insertion points on the server:
  // mirror the ids the server consumed, and keep the server content for as
  // long as the region is pending — never flash the fallback over it (even
  // when deferred runs re-enter pending after the walk).
  const region = (
    getter as unknown as Record<symbol, AsyncRegionMeta | undefined>
  )[ASYNC_REGION];
  const claimed =
    cur.node?.nodeType === Node.COMMENT_NODE &&
    (cur.node as Comment).data === "{";
  if (region && hydrationContext) hydrationContext.counter += region.ids;

  const slot = claimSlot(cur, om);
  const keepWhilePending = Boolean(region) && claimed;
  effect(() => {
    const value = getter();
    if (keepWhilePending && region!.pending()) return;
    slot.set(resolveChild(value as never));
  });
  onCleanup(() => slot.clear());
}

interface AsyncLike {
  state: "idle" | "pending" | "fulfilled" | "rejected";
  result: unknown;
}

function claimAsync(cur: Cursor, p: AsyncLike, om?: OnMismatch): void {
  const ctx = hydrationContext;
  if (ctx) {
    // Ids follow walk (document) order — same order the server assigned at
    // emit time. The instance decides what its record means: seed pending
    // state (stale-while-revalidate) and discard any deferred run, or, with
    // no record, execute the deferred run now.
    const record = ctx.data?.[String(ctx.counter++)];
    const claim = (
      p as unknown as Record<
        PropertyKey,
        ((r: { value: unknown } | undefined) => void) | undefined
      >
    )[CLAIM];
    claim?.(record);
  }
  const slot = claimSlot(cur, om);
  effect(() => {
    // Server content stays visible until the client-side value settles —
    // hydration does not blank pending (or not-yet-run idle) async regions.
    if (p.state !== "fulfilled" && p.state !== "rejected") return;
    slot.set(resolveChild(p.result as never));
  });
  onCleanup(() => slot.clear());
}

function claimSlot(cur: Cursor, om?: OnMismatch): Slot {
  const range = claimMarkerRange(cur, "{", "}");
  if (range) return Slot.claim(range.start, range.end);
  om?.({ expected: "<!--{-->", found: cur.node });
  const slot = new Slot();
  cur.parent.insertBefore(slot.get(), cur.node);
  return slot;
}

function claimMarkerRange(
  cur: Cursor,
  open: string,
  close: string,
): { start: Comment; end: Comment } | null {
  const start = cur.node;
  if (
    !start ||
    start.nodeType !== Node.COMMENT_NODE ||
    (start as Comment).data !== open
  ) {
    return null;
  }
  let depth = 0;
  let node: ChildNode | null = start;
  while (node) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const data = (node as Comment).data;
      if (data === open) depth++;
      else if (data === close && --depth === 0) {
        cur.node = node.nextSibling;
        return { start: start as Comment, end: node as Comment };
      }
    }
    node = node.nextSibling;
  }
  return null;
}

// ─ Raw HTML ───────────────────────────────────────────────────────────────────

/** `<Fragment html>` region: adopt the server markup between the markers. */
function claimRawRegion(cur: Cursor, source: unknown, om?: OnMismatch): void {
  const claimed =
    cur.node?.nodeType === Node.COMMENT_NODE &&
    (cur.node as Comment).data === "{";
  const slot = claimSlot(cur, om);
  if (typeof source !== "function") {
    // Claimed static region: server content is already correct. Fresh-built
    // (mismatch) region: fill it.
    if (!claimed && source != null) slot.set(parseHtml(String(source)));
    return;
  }
  // Reactive: keep the server content on the tracking first run, re-render
  // the region on subsequent changes. A fresh-built region has no server
  // content to keep, so it renders immediately.
  let first = claimed;
  effect(() => {
    const value = (source as () => unknown)();
    if (first) {
      first = false;
      return;
    }
    slot.set(parseHtml(value == null ? "" : String(value)));
  });
  onCleanup(() => slot.clear());
}

// ─ For ────────────────────────────────────────────────────────────────────────

function claimFor(cur: Cursor, v: ForVNode, om?: OnMismatch): void {
  const inst = new For();
  applyProps(inst as never, v.props);

  const range = claimMarkerRange(cur, "<For>", "</For>");
  if (!range) {
    om?.({ expected: "<!--<For>-->", found: cur.node });
    cur.parent.insertBefore(inst.render(), cur.node);
    return;
  }

  const items = untracked(() => inst.each);
  const entries = new Map<string | number, Entry>();
  const order: Array<string | number> = [];

  let node: ChildNode | null = range.start.nextSibling;
  let index = 0;
  while (node && node !== range.end && index < items.length) {
    if (
      node.nodeType === Node.COMMENT_NODE &&
      /^\[(?!\/)/.test((node as Comment).data)
    ) {
      const startC = node as Comment;
      const keyStr = startC.data.slice(1, -1);
      const endC = findEntryEnd(startC, range.end, keyStr);
      if (!endC) break; // malformed range — reconcile will heal the rest

      const item = items[index] as never;
      const key = inst.by(item, index);
      // Server markers carry the encoded key (see server forElement).
      if (encodeURIComponent(String(key)) !== keyStr) break; // drift — heals

      let dispose!: () => void;
      untracked(() => {
        dispose = effectScope(() => {
          const rendered = withClaimRenderer(() => inst.children(item, index));
          const itemCursor: Cursor = {
            node: startC.nextSibling,
            parent: startC.parentNode!,
          };
          walkList(itemCursor, rendered, om);
        });
      });
      entries.set(key, { start: startC, end: endC, dispose });
      order.push(key);
      index++;
      node = endC.nextSibling;
      continue;
    }
    node = node.nextSibling;
  }

  // Remove server rows the claim couldn't adopt — the first reconcile
  // rebuilds them fresh. Without this sweep, healed rows would duplicate
  // the leftover server markup.
  const keep = new Set<ChildNode>();
  for (const entry of entries.values()) {
    let kept: ChildNode | null = entry.start;
    while (kept) {
      keep.add(kept);
      if (kept === entry.end) break;
      kept = kept.nextSibling;
    }
  }
  let stray: ChildNode | null = range.start.nextSibling;
  while (stray && stray !== range.end) {
    const next = stray.nextSibling;
    if (!keep.has(stray)) stray.remove();
    stray = next;
  }

  inst.hydrateRange(range.start, range.end, entries, order);
  // hydrateRange's first reconcile heals anything the claim skipped.
}

function findEntryEnd(
  start: Comment,
  boundary: Comment,
  key: string,
): Comment | null {
  let node: ChildNode | null = start.nextSibling;
  while (node && node !== boundary) {
    if (
      node.nodeType === Node.COMMENT_NODE &&
      (node as Comment).data === `[/${key}]`
    ) {
      return node as Comment;
    }
    node = node.nextSibling;
  }
  return null;
}

// ─ Fresh-build fallback ───────────────────────────────────────────────────────

function fallback(
  cur: Cursor,
  om: OnMismatch | undefined,
  expected: string,
  build: () => Node,
): void {
  om?.({ expected, found: cur.node });
  const stale = cur.node;
  const fresh = build();
  cur.parent.insertBefore(fresh, stale);
  if (stale) {
    cur.node = stale.nextSibling;
    cur.parent.removeChild(stale);
  }
}

function buildVNode(v: VNode): Node {
  if (v.kind === "el") {
    const props = { ...v.props };
    if ("children" in props) props.children = buildChildValue(props.children);
    return createElement(v.tag, props) as Node;
  }
  if (v.kind === "frag") {
    return Fragment({
      children: (() => buildChildValue(v.children)) as never,
    });
  }
  return createElement(For, v.props) as Node;
}

function buildChildValue(c: unknown): unknown {
  if (Array.isArray(c)) return c.map(buildChildValue);
  if (isVNode(c)) return buildVNode(c);
  return c;
}
