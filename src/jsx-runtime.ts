import { effect, isReactive } from "./signals";
import { Slot } from "./slot";
import { SLOTS } from "./slot";
import { toNode, VALUE } from "./core";
import {
  AnyFn,
  Child,
  ComponentClass,
  Disposer,
  ComponentFn,
} from "./jsx-runtime/types";

// ═══════════════════════════════════════════════════════════════════════════════
// Part 1: Property assignment  (SolidJS 2.0 — dom-expressions/src/constants.js)
//
// SolidJS 2.0 uses static compile-time sets. We mirror those sets at runtime.
//
// Decision tree for each prop key:
//   1. Explicit namespaces (evaluated before everything else):
//        prop:name   → always DOM property  (el[name] = value)
//        class:name  → classList.toggle(name, value)      [SolidJS 2.0]
//        style:prop  → style.setProperty(prop, value)     [SolidJS 2.0]
//        on:event    → addEventListener (handled in isEventKey)
//   2. style / class → special handlers
//   4. ChildProperties (innerHTML, textContent, innerText) → DOM property
//   5. Properties (value, checked, selected, muted):
//        non-SVG  → DOM property
//        SVG      → setAttribute
//   6. SVG attribute namespaces: xlink:href → setAttributeNS
//   7. Default → setAttribute
//        (null / false → removeAttribute,  true → "")
//
// Note: unlike the original, which does compile-time analysis, we do the same
// checks at runtime. Custom element attributes correctly fall through to
// setAttribute, which triggers attributeChangedCallback as expected.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * From dom-expressions/src/shared/utils.js — reservedNameSpaces.
 * These namespace prefixes are intercepted before default attribute handling.
 * "on" is handled separately via isEventKey before setData is called.
 */
const ReservedNameSpaces = new Set(["class", "on", "style", "prop"]);

/**
 * From dom-expressions/src/constants.js — Properties.
 * These MUST be set as DOM properties; setAttribute doesn't reflect them.
 */
const Properties = new Set(["value", "checked", "selected", "muted"]);

/**
 * From dom-expressions/src/constants.js — ChildProperties.
 * Content is set by direct property assignment (not attribute).
 */
const ChildProperties = new Set(["innerHTML", "textContent", "innerText"]);

/**
 * SVG namespace URIs for namespaced attributes (xlink:href, xml:lang, etc.).
 * From dom-expressions/src/constants.js — SVGNamespace.
 */
const SVGNamespace: Record<string, string> = {
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
};

function applyStyle(el: Element, value: unknown): void {
  const s = (el as HTMLElement).style;
  if (!s) return;
  if (typeof value === "string") s.cssText = value;
  else if (value && typeof value === "object") Object.assign(s, value);
}

function setAttribute(el: Element, key: string, value: unknown): void {
  if (value == null || value === false) el.removeAttribute(key);
  else el.setAttribute(key, value === true ? "" : String(value));
}

function isEventKey(key: string): boolean {
  // on:click  → addEventListener (explicit namespace)
  // onClick   → camelCase convention (second char uppercase)
  return (
    key.startsWith("on:") ||
    (key.length > 2 && key.startsWith("on") && key[2] >= "A" && key[2] <= "Z")
  );
}

/**
 * Registers an event listener derived from a prop key.
 * Supports both `on:click` and `onClick` conventions.
 * Returns a cleanup disposer.
 */
function setEvent(el: Element, key: string, handler: unknown): Disposer {
  const event = key.startsWith("on:")
    ? key.slice(3)
    : key[2].toLowerCase() + key.slice(3); // onClick → click

  el.addEventListener(event, handler as EventListener);
  return () => el.removeEventListener(event, handler as EventListener);
}

/**
 * Assigns a single non-event, non-ref prop to an element.
 * Mirrors the setAttr flow from dom-expressions/src/dom/element.js:
 * parse namespace once, dispatch reserved → aliases → special → default.
 */
function setData(el: Element, key: string, value: unknown): void {
  // ─ Namespaced keys ────────────────────────────────────────────────────────
  // Parse once (like dom-expressions setAttr), then dispatch.
  const colonIdx = key.indexOf(":");
  if (colonIdx > -1) {
    const ns = key.slice(0, colonIdx);
    const name = key.slice(colonIdx + 1);

    if (ReservedNameSpaces.has(ns)) {
      if (ns === "prop") {
        (el as unknown as Record<string, unknown>)[name] = value;
        return;
      }
      if (ns === "class") {
        (el as HTMLElement).classList.toggle(name, Boolean(value));
        return;
      }
      if (ns === "style") {
        if (value == null || value === false)
          (el as HTMLElement).style.removeProperty(name);
        else (el as HTMLElement).style.setProperty(name, String(value));
        return;
      }
      // "on" namespace: should not reach here (handled by isEventKey)
      return;
    }

    // SVG namespaced attributes (xlink:href, xml:lang)
    const svgNs = SVGNamespace[ns];
    if (svgNs) {
      el.setAttributeNS(svgNs, key, String(value ?? ""));
      return;
    }
  }

  // ─ Special props ──────────────────────────────────────────────────────────
  if (key === "class") {
    (el as HTMLElement).className = String(value ?? "");
    return;
  }
  if (key === "style") {
    applyStyle(el, value);
    return;
  }

  // ─ ChildProperties: innerHTML, textContent, innerText ────────────────────
  if (ChildProperties.has(key)) {
    (el as unknown as Record<string, unknown>)[key] = value ?? "";
    return;
  }

  // ─ Properties: value, checked, selected, muted ───────────────────────────
  // SolidJS 2.0: only these 4 bypass setAttribute for non-SVG elements.
  if (!(el instanceof SVGElement) && Properties.has(key)) {
    (el as unknown as Record<string, unknown>)[key] = value;
    return;
  }

  // ─ Custom element own properties ─────────────────────────────────────────
  // SolidJS 2.0: custom elements (hyphenated tag names) set props as
  // properties by default so reactive setters are invoked correctly.
  if (el.nodeName.includes("-")) {
    (el as unknown as Record<string, unknown>)[key] = value;
    return;
  }

  // ─ Default: setAttribute ─────────────────────────────────────────────────
  // Covers all standard HTML attributes, aria-*, data-*, and custom element
  // attributes (triggers attributeChangedCallback correctly).
  setAttribute(el, key, value);
}

/**
 * Assigns a `slot:name` prop to the element's named slot (if any).
 * Requires the element to carry a SlotManager under the SLOTS symbol.
 */
function setSlot(el: Element, name: string, value: unknown): void {
  const slots = (el as unknown as Record<symbol, unknown>)[SLOTS] as
    | Record<string, { set(node: HTMLElement): void }>
    | undefined;
  const slot = slots?.[name];
  if (!slot) return;
  slot.set(resolveNode(value) as HTMLElement);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Part 2: Children
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Converts any child value into a DOM Node.
 * - Primitive (string / number) → TextNode
 * - null / false / undefined    → empty Comment (placeholder)
 * - ElementBuilder              → unwrapped via VALUE
 * - Node                        → returned as-is
 */
function resolveNode(value: unknown): Node {
  if (value instanceof Node) return value;
  if (value == null || value === false) return document.createComment("");
  if (value && typeof value === "object" && VALUE in value)
    return toNode(value as never);
  return document.createTextNode(String(value));
}

/**
 * Appends a single child to `el`, handling reactive children via Slot.
 * Arrays are recursively flattened.
 */
function mountChild(
  el: Element | DocumentFragment,
  child: unknown,
  disposables: Set<Disposer>,
): void {
  if (child == null || child === false) return;

  // Reactive child: () => Child  — any function is treated as a reactive getter
  if (typeof child === "function") {
    const slot = Slot.new();
    el.appendChild(slot());
    disposables.add(
      effect(() => slot.set(resolveNode((child as AnyFn)()) as HTMLElement)),
    );
    return;
  }

  // Nested arrays
  if (Array.isArray(child)) {
    for (const c of child) mountChild(el, c, disposables);
    return;
  }

  el.appendChild(resolveNode(child));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Part 3: Element resolution
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detects whether `fn` is a class constructor vs a plain function.
 * Heuristic: class declarations emit `class` as the first token in toString().
 */
function isClassConstructor(fn: unknown): fn is ComponentClass {
  return (
    typeof fn === "function" &&
    /^\s*class[\s{]/.test(Function.prototype.toString.call(fn))
  );
}

/**
 * Resolves the `type` argument of createElement into a concrete DOM node:
 *   - string          → document.createElement(type)
 *   - Element         → the element itself  (apply props to an existing node)
 *   - class component → new type()
 *   - function comp.  → type(props)  (may return Element, Fragment, or null)
 */
function resolveElement(
  type: string | Element | ComponentFn | ComponentClass,
  props: Record<string, unknown>,
): Element | DocumentFragment | null {
  if (typeof type === "string") return document.createElement(type);
  if (type instanceof Element) return type;
  if (typeof type === "function") {
    if (isClassConstructor(type))
      return new (type as ComponentClass)() as Element;
    return (type as ComponentFn)(props);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Part 4: createElement  (the JSX transform target)
// ═══════════════════════════════════════════════════════════════════════════════

function createElement(
  type: string | Element | ComponentFn | ComponentClass,
  props: Record<string, unknown> | null,
): Element | DocumentFragment | null {
  const { children: rawChildren, ref, ...attrs } = props ?? {};

  const el = resolveElement(type, props ?? {});
  if (!el) return null;

  // ref callback — fire once, synchronously, before children are mounted
  if (typeof ref === "function") (ref as AnyFn)(el);

  // DocumentFragment components (If, Map, …) manage their own internals.
  // We skip prop/child processing and return them directly.
  if (el instanceof DocumentFragment) return el;

  const disposables = new Set<Disposer>();

  // ─ Props ──────────────────────────────────────────────────────────────────
  for (const [key, value] of Object.entries(attrs)) {
    // Slot assignment: slot:header={<h1>Title</h1>}
    if (key.startsWith("slot:")) {
      setSlot(el, key.slice(5), value);
      continue;
    }

    // Events are never reactive — register once
    if (isEventKey(key)) {
      disposables.add(setEvent(el, key, value));
      continue;
    }

    // Reactive data prop: wrap in effect so it re-runs when signal changes
    if (isReactive(value as AnyFn)) {
      disposables.add(effect(() => setData(el, key, (value as AnyFn)())));
      continue;
    }

    setData(el, key, value);
  }

  // ─ Children ───────────────────────────────────────────────────────────────
  const children = normalizeChildren(rawChildren);
  for (const child of children) mountChild(el, child, disposables);

  if (disposables.size > 0) attachDisposables(el, disposables);

  return el;
}

/** Normalises the children prop into a flat array. */
function normalizeChildren(raw: unknown): unknown[] {
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

// ─ Disposable attachment ─────────────────────────────────────────────────────

const JSX_DISPOSABLES: unique symbol = Symbol("jsx.disposables");

function attachDisposables(el: Element, disposables: Set<Disposer>): void {
  Object.defineProperty(el, JSX_DISPOSABLES, {
    value: disposables,
    configurable: true,
  });
}

/** Runs all cleanup functions registered by JSX props/effects on `el`. */
export function disposeElement(el: Element): void {
  const d = (el as unknown as Record<symbol, unknown>)[JSX_DISPOSABLES] as
    | Set<Disposer>
    | undefined;
  d?.forEach((fn) => fn());
  d?.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Part 5: Special components
//
// Map  — reactive keyed list rendering
// If   — conditional rendering
// Item — marker returned by <item> inside <Map>; carries a render function
//        and an optional key extractor so Map can do keyed reconciliation
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// Part 6: Exports & JSX type declarations
// ═══════════════════════════════════════════════════════════════════════════════

export {
  createElement as jsx,
  createElement as jsxs,
  createElement as jsxDEV,
  createElement as h,
};

// ─ JSX namespace ─────────────────────────────────────────────────────────────

type ReactiveOr<T> = T | (() => T);
type EventHandler<E extends Event = Event> = (event: E) => void;

/** Props shared by every intrinsic element. */
interface BaseProps {
  ref?: (el: Element) => void;
  class?: ReactiveOr<string>;
  style?: ReactiveOr<string | Partial<CSSStyleDeclaration>>;
  innerHTML?: ReactiveOr<string>;
  children?: Child | Child[];
  [prop: `prop:${string}`]: unknown;
  [slot: `slot:${string}`]: Child;
  [event: `on:${string}`]: EventHandler;
  [style: `style:${string}`]: ReactiveOr<string | null>;
  [cls: `class:${string}`]: ReactiveOr<boolean>;
}

type IntrinsicHTMLProps<T extends HTMLElement> = BaseProps &
  Partial<{
    [K in keyof T as K extends keyof BaseProps | `on${string}`
      ? never
      : T[K] extends Function
        ? never
        : K]: ReactiveOr<T[K]>;
  }> & {
    [K in keyof HTMLElementEventMap as `on${Capitalize<K>}`]?: EventHandler<
      HTMLElementEventMap[K]
    >;
  };

export namespace JSX {
  export type Element = globalThis.Element | DocumentFragment | null;

  export interface ElementChildrenAttribute {
    children: {};
  }

  /** Special components available inside a <Map> children context. */
  export interface MapIntrinsicElements {
    item: {
      key?: (item: any, index: number) => string | number;
      children: (item: any, index: number) => JSX.Element;
    };
  }

  /** Special components available inside an <If>. */
  export interface IfIntrinsicElements {
    then: { children: Child | Child[] };
    else: { children: Child | Child[] };
  }

  type IntrinsicHTMLElements = {
    [K in keyof HTMLElementTagNameMap]: IntrinsicHTMLProps<
      HTMLElementTagNameMap[K]
    >;
  };

  export interface IntrinsicElements extends IntrinsicHTMLElements {
    [customElement: `${string}-${string}`]: BaseProps & Record<string, unknown>;
  }
}
