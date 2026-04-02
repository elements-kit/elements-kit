import { Child } from "./types";
import { createElement } from "./element";

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
