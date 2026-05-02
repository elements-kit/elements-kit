import { effect, effectScope, onCleanup } from "../signals";
import { PropsTarget, Child, Disposer } from "./types";
import { SLOTS, Slot } from "../slot";
import { PrimitiveNodeType, resolveNode } from "../lib";

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
  // Each slot gets its own effectScope so its onCleanup is isolated from
  // siblings — effectScope links to the parent scope (no untracked), so it is
  // disposed automatically when the parent component tears down.
  effectScope(() => {
    // For static class-component children (e.g. <For>), capture Symbol.dispose
    // before slot.set() transfers the fragment's DOM children. slot.clear()
    // only covers Element children; this covers the fragment's own effectScope.
    let dispose: (() => void) | undefined;
    if (typeof value === "function") {
      effect(() => slot.set(resolveChild(value())));
    } else {
      const node = resolveChild(value);
      dispose = (node as unknown as Partial<Disposable>)[Symbol.dispose];
      slot.set(node);
    }
    // Dispose the current slot content when the parent scope tears down.
    // Intermediate replacements are already handled by slot.set() → slot.clear().
    onCleanup(() => {
      dispose?.();
      slot.clear();
    });
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
    if (kind === 0) return StaticKind.Mixed; // saw both kinds
  }
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
    effectScope(() => {
      onCleanup(() => ds.forEach((d) => d()));
    });
  }
}

/**
 * Mounts a single child into `el`. Reactive functions become live slots; other
 * values append as-is. Each child owns its own `effectScope` so sibling
 * `onCleanup` registrations don't overwrite each other (the signals lib
 * supports only one onCleanup per subscriber).
 *
 * Also used by `createFunctionElement` when a component returns a reactive
 * getter or primitive — keeps the component's `effectScope` alive for the
 * lifetime of the fragment it mounts into.
 */
export function mountChild(el: Element | DocumentFragment, child: Child): void {
  if (typeof child === "function") {
    const slot = new Slot();
    el.appendChild(slot.render());
    effectScope(() => {
      effect(() => slot.set(resolveChild(child())));
      onCleanup(() => slot.clear());
    });
    return;
  }
  const node = resolveChild(child as any);
  // Extract Symbol.dispose before appendChild — DocumentFragment children are
  // transferred on append, but the JS object and its dispose fn persist.
  const dispose = (node as unknown as Partial<Disposable>)[Symbol.dispose];
  el.appendChild(node);
  if (dispose)
    effectScope(() => {
      onCleanup(dispose);
    });
}

function resolveChild(value: Child): Node {
  if (Array.isArray(value)) {
    const fragment = document.createDocumentFragment();
    for (const item of value as any[]) {
      fragment.appendChild(resolveChild(item));
    }
    return fragment;
  }
  if (typeof value === "function") return resolveChild(value());
  return resolveNode(value as PrimitiveNodeType);
}

/** Normalises the children prop into a flat array. */
function ensureFlatArray<T>(raw: T | T[]): T[] {
  const r = Array.isArray(raw) ? raw : [raw];
  return r.flat(Infinity) as T[];
}
