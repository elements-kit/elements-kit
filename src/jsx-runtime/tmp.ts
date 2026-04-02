// ═══════════════════════════════════════════════════════════════════════════════
// Part 5: Special components
//
// Map  — reactive keyed list rendering
// If   — conditional rendering
// Item — marker returned by <item> inside <Map>; carries a render function
//        and an optional key extractor so Map can do keyed reconciliation
// ═══════════════════════════════════════════════════════════════════════════════

import { effect } from "alien-signals";
import { isReactive } from "../signals";
import { Slot } from "../slot";
import { AnyFn, Child } from "./types";

// ─ Item marker ───────────────────────────────────────────────────────────────

const ITEM_MARKER: unique symbol = Symbol("jsx.map.item");

interface ItemMarker<T = unknown> {
  readonly [ITEM_MARKER]: true;
  readonly render: (
    item: T,
    index: number,
  ) => Element | DocumentFragment | null;
  readonly key?: (item: T, index: number) => string | number;
}

function isItemMarker(v: unknown): v is ItemMarker {
  return typeof v === "object" && v !== null && ITEM_MARKER in v;
}

/**
 * `<item>` — declares the per-item template inside a `<Map>`.
 *
 * @example
 * ```tsx
 * <Map each={todos}>
 *   <item key={t => t.id}>{t => <li>{t.text}</li>}</item>
 * </Map>
 * ```
 */
export function item<T>(props: {
  children: (item: T, index: number) => Element | DocumentFragment | null;
  key?: (item: T, index: number) => string | number;
}): ItemMarker<T> {
  return { [ITEM_MARKER]: true, render: props.children, key: props.key };
}

// ─ Map ───────────────────────────────────────────────────────────────────────

interface MapProps<T = unknown> {
  /** The array to iterate over. May be a signal. */
  each: T[] | (() => T[]);
  /**
   * Key extractor for reconciliation.
   * When omitted the list is reconciled by index (faster, but loses state on
   * reorder).
   */
  key?: (item: T, index: number) => string | number;
  /**
   * Either a render function `(item, index) => Element` or a single `<item>`
   * child that carries both the render function and an optional key extractor.
   */
  children:
    | ((item: T, index: number) => Element | DocumentFragment | null)
    | ItemMarker<T>;
}

/**
 * `<Map>` — reactive list rendering with optional keyed reconciliation.
 *
 * @example
 * ```tsx
 * // Render function shorthand
 * <Map each={todos} key={t => t.id}>
 *   {t => <li>{t.text}</li>}
 * </Map>
 *
 * // <item> child (key extractor lives alongside the template)
 * <Map each={todos}>
 *   <item key={t => t.id}>{t => <li>{t.text}</li>}</item>
 * </Map>
 * ```
 */
export function Map<T>(props: MapProps<T>): DocumentFragment {
  const { each, key: propKeyFn, children } = props;

  // Resolve render fn and key fn from either shorthand or <item> marker
  const renderFn: (
    item: T,
    index: number,
  ) => Element | DocumentFragment | null = isItemMarker(children)
    ? children.render
    : (children as (
        item: T,
        index: number,
      ) => Element | DocumentFragment | null);

  const keyFn =
    propKeyFn ?? (isItemMarker(children) ? children.key : undefined);

  // Fragment with comment markers so Map has no wrapper element in the DOM
  const frag = document.createDocumentFragment();
  const start = document.createComment("<Map>");
  const end = document.createComment("</Map>");
  frag.appendChild(start);
  frag.appendChild(end);

  const getList = isReactive(each as AnyFn)
    ? (each as () => T[])
    : () => each as T[];

  if (keyFn) {
    reconcileKeyed(start, end, getList, renderFn, keyFn);
  } else {
    reconcileIndexed(start, end, getList, renderFn);
  }

  return frag;
}

/**
 * Index-based reconciliation: replaces all children on every list change.
 * Simple and fast for small lists where order rarely changes.
 */
function reconcileIndexed<T>(
  start: Comment,
  end: Comment,
  getList: () => T[],
  render: (item: T, index: number) => Element | DocumentFragment | null,
): void {
  effect(() => {
    const parent = start.parentNode;
    if (!parent) return;

    // Clear current content between markers
    const range = document.createRange();
    range.setStartAfter(start);
    range.setEndBefore(end);
    range.deleteContents();

    const list = getList();
    if (!list.length) return;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < list.length; i++) {
      const node = render(list[i], i);
      if (node) frag.appendChild(node);
    }
    parent.insertBefore(frag, end);
  });
}

/**
 * Keyed reconciliation: moves / creates / removes nodes while preserving
 * existing DOM nodes for items whose key is unchanged.
 *
 * Algorithm (reverse insertion for O(n) pointer moves):
 *   1. Compute new key order.
 *   2. Remove nodes whose keys are no longer in the list.
 *   3. Walk the new list in reverse, inserting before a moving `cursor`.
 *      Items with an existing node are moved; new items are created.
 */
function reconcileKeyed<T>(
  start: Comment,
  end: Comment,
  getList: () => T[],
  render: (item: T, index: number) => Element | DocumentFragment | null,
  keyFn: (item: T, index: number) => string | number,
): void {
  const keyedNodes = new global.Map<string | number, Element>();

  effect(() => {
    const parent = start.parentNode;
    if (!parent) return;

    const list = getList();
    const newKeys = list.map(keyFn);
    const newKeySet = new Set(newKeys);

    // Remove stale nodes
    for (const [k, node] of keyedNodes) {
      if (!newKeySet.has(k)) {
        node.remove();
        keyedNodes.delete(k);
      }
    }

    // Insert / move in reverse so we can use a simple "insert before cursor"
    let cursor: Node = end;
    for (let i = list.length - 1; i >= 0; i--) {
      const k = newKeys[i];
      let node = keyedNodes.get(k);

      if (!node) {
        const rendered = render(list[i], i);
        if (!rendered || rendered instanceof DocumentFragment) {
          continue;
        }
        node = rendered;
        keyedNodes.set(k, node);
      }

      // Move only if not already in position
      if (node.nextSibling !== cursor) {
        parent.insertBefore(node, cursor);
      }
      cursor = node;
    }
  });
}

// Alias to avoid shadowing the built-in Map
const global = { Map: globalThis.Map };

// ─ If ────────────────────────────────────────────────────────────────────────

interface IfProps {
  /** Condition — can be a plain boolean or a signal. */
  when: boolean | (() => boolean);
  /** Content to render when condition is truthy. */
  children: Child | (() => Child);
  /** Optional fallback rendered when condition is falsy. */
  fallback?: Child | (() => Child);
}

/**
 * `<If>` — conditional rendering without mounting/unmounting wrapper elements.
 *
 * @example
 * ```tsx
 * <If when={isLoggedIn}>
 *   <Dashboard />
 * </If>
 *
 * <If when={isLoggedIn} fallback={<Login />}>
 *   <Dashboard />
 * </If>
 * ```
 */
export function If(props: IfProps): DocumentFragment {
  const { when, children, fallback } = props;

  const frag = document.createDocumentFragment();
  const slot = Slot.new();
  frag.appendChild(slot());

  const getCondition: () => boolean = isReactive(when as AnyFn)
    ? (when as () => boolean)
    : () => when as boolean;

  const getContent: () => unknown = isReactive(children as AnyFn)
    ? (children as () => unknown)
    : () => children;

  const getFallback: (() => unknown) | null =
    fallback == null
      ? null
      : isReactive(fallback as AnyFn)
        ? (fallback as () => unknown)
        : () => fallback;

  effect(() => {
    const show = getCondition();
    const value = show ? getContent() : getFallback?.();
    slot.set(
      (value != null && value !== false
        ? resolveNode(value)
        : document.createComment("")) as HTMLElement,
    );
  });

  return frag;
}
