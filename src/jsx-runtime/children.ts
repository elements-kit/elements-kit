import { effect, onCleanup } from "../signals";
import { PropsTarget, Child, Disposer } from "./types";
import { SLOTS, Slot } from "../slot";
import { isRawHtml, PrimitiveNodeType, RAW_HTML, resolveNode } from "../lib";

// ─ Typed SLOTS accessor ──────────────────────────────────────────────────────

type SlotsMap = Record<string, Slot>;
type WithSlots = PropsTarget & { [SLOTS]: SlotsMap };

function hasSlots(node: PropsTarget): node is WithSlots {
  return SLOTS in node;
}

// ─ Public API ─────────────────────────────────────────────────────────────────

export function isChildrenProperty(node: PropsTarget, key: string): boolean {
  if (
    key === "children" &&
    (node instanceof Element || node instanceof DocumentFragment)
  )
    return true;

  if (hasSlots(node)) {
    const slotName = key.replace(/^slot:/, "");
    if (slotName in node[SLOTS]) return true;
    // fall through — still check "children" and direct Slot properties
  }

  return key in node && (node as Record<string, any>)[key] instanceof Slot;
}

export function applyChildren(
  node: PropsTarget,
  key: string,
  value: Child,
): void {
  // ─ SLOTS ─────────────────────────────────────────────────────────────────
  if (hasSlots(node)) {
    const slotName = key.replace(/^slot:/, "");
    if (slotName in node[SLOTS]) {
      applySlot(node[SLOTS][slotName], value);
      return;
    }
  }

  // ─ Children ─────────────────────────────────────────────────────────────────
  if (
    key === "children" &&
    (node instanceof Element || node instanceof DocumentFragment)
  ) {
    mountChildren(node as Element | DocumentFragment, value);
    return;
  }

  // ─ Slots ─────────────────────────────────────────────────────────────────
  if (key in node) {
    const slot = (node as unknown as Record<typeof key, unknown>)[key];
    if (!(slot instanceof Slot)) return;
    applySlot(slot, value);
  }
}

// ─ Helpers ────────────────────────────────────────────────────────────────────

function applySlot(slot: Slot, value: Child): void {
  // Relies on the caller's effectScope (every JSX render sits inside one).
  // The signals lib supports multiple onCleanup per scope (push to array), so
  // sibling slots don't clobber each other. Intermediate replacements are
  // handled by slot.set() → slot.clear(); this onCleanup covers final teardown.
  let dispose: (() => void) | undefined;
  if (typeof value === "function") {
    effect(() => slot.set(resolveChild(value())));
  } else {
    const node = resolveChild(value);
    dispose = (node as unknown as Partial<Disposable>)[Symbol.dispose];
    slot.set(node);
  }
  onCleanup(() => {
    dispose?.();
    slot.clear();
  });
}

// Pool of reusable DocumentFragments. After `el.appendChild(buffer)` the
// buffer's children transfer to `el` and the fragment is empty — safe to
// recycle. Keeps allocations down on burst-mount workloads (long lists,
// `<For>` re-renders).
const FRAGMENT_POOL_MAX = 4;
const fragmentPool: DocumentFragment[] = [];

function acquireFragment(): DocumentFragment {
  return fragmentPool.pop() ?? document.createDocumentFragment();
}

function releaseFragment(frag: DocumentFragment): void {
  if (fragmentPool.length < FRAGMENT_POOL_MAX) fragmentPool.push(frag);
}

function mountChildren(el: Element | DocumentFragment, value: Child): void {
  const list = ensureFlatArray<Child>(value);
  if (list.length === 0) return;
  if (list.length === 1) {
    mountChild(el, list[0]);
    return;
  }

  // Static fast path: skip per-child Slot/effectScope wiring when no child is
  // reactive. Saves N effectScope allocations and disposer registrations.
  // Single-pass classification picks the tightest mountStatic loop variant.
  const kind = classifyStatic(list);
  if (kind !== StaticKind.Reactive) {
    mountStatic(el, list, kind);
    return;
  }

  // Mixed/reactive path: buffer all appends into one fragment so the parent
  // sees a single insertion (one layout invalidation instead of N).
  const buffer = acquireFragment();
  for (const child of list) mountChild(buffer, child);
  el.appendChild(buffer);
  releaseFragment(buffer);
}

// Single-pass classifier for the static-children fast path. Returns the kind
// of every element so mountStatic can pick a tighter loop (all-Node /
// all-primitive / mixed) without re-checking each child.
const enum StaticKind {
  Reactive = 0,
  AllNode = 1,
  AllPrimitive = 2,
  Mixed = 3,
}

function classifyStatic(list: readonly Child[]): StaticKind {
  let kind = StaticKind.AllNode | StaticKind.AllPrimitive;
  for (const c of list) {
    if (c == null || c === false || c === true) continue;
    if (typeof c === "function") return StaticKind.Reactive;
    if (c instanceof Node) {
      kind &= StaticKind.AllNode;
    } else if (typeof c === "string" || typeof c === "number") {
      kind &= StaticKind.AllPrimitive;
    } else {
      return StaticKind.Reactive;
    }
    // Don't short-circuit when both flags clear — must keep scanning so a
    // later function child still flips us to Reactive.
  }
  if (kind === 0) return StaticKind.Mixed;
  // If only nullish/bool seen, kind is still both flags — treat as primitive
  return kind === (StaticKind.AllNode | StaticKind.AllPrimitive)
    ? StaticKind.AllPrimitive
    : kind;
}

function mountStatic(
  el: Element | DocumentFragment,
  list: readonly Child[],
  kind: StaticKind,
): void {
  const buffer = acquireFragment();
  let disposers: Disposer[] | null = null;

  if (kind === StaticKind.AllNode) {
    // No type checks per child — straight `appendChild` + dispose harvest.
    for (const c of list) {
      if (c == null || c === false || c === true) continue;
      const node = c as Node;
      const dispose = (node as unknown as Partial<Disposable>)[Symbol.dispose];
      if (dispose) (disposers ??= []).push(dispose);
      buffer.appendChild(node);
    }
  } else if (kind === StaticKind.AllPrimitive) {
    // Every child becomes a text node — single-shot string conversion.
    for (const c of list) {
      if (c == null || c === false || c === true) continue;
      buffer.appendChild(document.createTextNode(String(c)));
    }
  } else {
    // Mixed Node + primitive: per-child branching.
    for (const c of list) {
      if (c == null || c === false || c === true) continue;
      if (c instanceof Node) {
        const dispose = (c as unknown as Partial<Disposable>)[Symbol.dispose];
        if (dispose) (disposers ??= []).push(dispose);
        buffer.appendChild(c);
      } else {
        buffer.appendChild(document.createTextNode(String(c)));
      }
    }
  }

  el.appendChild(buffer);
  releaseFragment(buffer);
  if (disposers && disposers.length > 0) {
    const ds = disposers;
    onCleanup(() => ds.forEach((d) => d()));
  }
}

/**
 * Mounts a single child into `el`. Reactive functions become live slots; other
 * values append as-is.
 *
 * Relies on the caller's effectScope (every JSX render sits inside one). The
 * signals lib supports multiple onCleanup per scope, so siblings coexist.
 *
 * Also used by `createFunctionElement` when a component returns a reactive
 * getter or primitive — keeps the component's `effectScope` alive for the
 * lifetime of the fragment it mounts into.
 */
export function mountChild(el: Element | DocumentFragment, child: Child): void {
  if (typeof child === "function") {
    const slot = new Slot();
    el.appendChild(slot.render());
    effect(() => slot.set(resolveChild(child())));
    onCleanup(() => slot.clear());
    return;
  }
  const node = resolveChild(child as any);
  // Extract Symbol.dispose before appendChild — DocumentFragment children are
  // transferred on append, but the JS object and its dispose fn persist.
  const dispose = (node as unknown as Partial<Disposable>)[Symbol.dispose];
  el.appendChild(node);
  if (dispose) onCleanup(dispose);
}

export function resolveChild(value: Child): Node {
  // Hot order: Node → primitive → function → array. Most JSX expressions
  // resolve to a Node (already-rendered element) or a primitive (text from a
  // signal); reactive thunks and arrays trail.
  if (value instanceof Node) return value;
  if (isRawHtml(value)) {
    // Script-inert raw HTML (see Fragment html). Wrapper tag/name are used by
    // the Astro integration's slot mapping.
    const template = document.createElement("template");
    template.innerHTML = value[RAW_HTML];
    if (!value.tag) return template.content;
    const el = document.createElement(value.tag);
    if (value.name) el.setAttribute("name", value.name);
    el.appendChild(template.content);
    return el;
  }
  if (typeof value === "string" || typeof value === "number")
    return document.createTextNode(String(value));
  if (value == null || typeof value === "boolean")
    return document.createComment("");
  if (typeof value === "function") return resolveChild((value as () => Child)());
  if (Array.isArray(value)) {
    const fragment = document.createDocumentFragment();
    for (const item of value as any[]) {
      fragment.appendChild(resolveChild(item));
    }
    return fragment;
  }
  return resolveNode(value as PrimitiveNodeType);
}

/** Normalises the children prop into a flat array. */
function ensureFlatArray<T>(raw: T | T[]): T[] {
  const r = Array.isArray(raw) ? raw : [raw];
  return r.flat(Infinity) as T[];
}
