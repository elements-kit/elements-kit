import { Child, Component, ComponentClass, Disposer } from "./types";
import { applyProps } from "./properties";
import { $ref } from "./ref";
import "../polyfill";

function createElement(
  type: string | Element | ComponentClass,
  { [$ref]: ref, ...props }: Record<string | symbol, unknown> = {},
): Element | DocumentFragment | null {
  const node = resolveElement(type);
  if (!node) return null;

  // TODO: remove this later
  // DocumentFragment components (If, Map, …) manage their own internals.
  // We skip prop/child processing and return them directly.
  if (node instanceof DocumentFragment) return node;

  // ─ Properties ─────────────────────────────────────────────────────────────
  const disposables = applyProps(node, props);

  if (disposables.size > 0) attachDisposables(node, disposables);

  const el = _render(node);

  // ref fires after render with the final Element
  if (typeof ref === "function" && el instanceof Element) ref(el);

  return el;
}

function _render(
  node: ComponentClass | Element | DocumentFragment | null,
): Element | DocumentFragment | null {
  if (node instanceof Element || node instanceof DocumentFragment) return node;
  if (!node || typeof node.render !== "function") return null;
  return _render(node.render());
}

/**
 * Resolves the `type` argument of createElement into a concrete DOM node:
 *   - string          → document.createElement(type)
 *   - Element         → the element itself  (apply props to an existing node)
 *   - class component → new type()
 */
function resolveElement(
  type: string | Element | ComponentClass,
): ComponentClass | Element | DocumentFragment | null {
  if (typeof type === "string") return document.createElement(type);
  if (type instanceof Element) return type;

  return new type();
}

// ─ Disposable attachment ─────────────────────────────────────────────────────

function hasOwnDisposable(el: Component): el is Component & Disposable {
  return Symbol.dispose in el;
}
function attachDisposables(el: Component, disposables: Set<Disposer>): void {
  const existingDispose = hasOwnDisposable(el)
    ? el[Symbol.dispose].bind(el)
    : null;

  Object.defineProperty(el, Symbol.dispose, {
    value() {
      existingDispose?.();
      disposables.forEach((fn) => fn());
      disposables.clear();
    },
    configurable: true,
  });
}

/** Runs all cleanup functions registered by JSX props/effects on `el`. */
export function disposeElement(el: Element): void {
  (el as unknown as Disposable)[Symbol.dispose]?.();
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
