import { Child, Component } from "./types";
import { createElement } from "./element";
import type { JSX as DomJSX } from "dom-expressions/src/jsx-h";
import type { CustomElementRegistry } from "../custom-elements";
import type {
  AnyElementCtor,
  ElementProps,
  MaybeReactiveProps,
  ResolveProps,
} from "./infer";
import { Computed } from "../signals";

export type {
  ComponentProps,
  ElementProps,
  MaybeReactiveProps,
  Props,
  RawProps,
  ReactiveProps,
  ResolveProps,
  Require,
} from "./infer";

export type {
  Child,
  Component,
  ComponentClass,
  ComponentFn,
  ComponentInstance,
  PropsTarget as PropsTarget,
} from "./types";

export type { MaybeReactive } from "../signals";

export {
  createElement as jsx,
  createElement as jsxs,
  createElement as jsxDEV,
  createElement as h,
};
export { Fragment } from "./fragment";

// ─ Helpers: namespaced prop types ────────────────────────────────────────────

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
  [P in K as `slot:${P}`]?: Child;
};

/**
 * Get the full JSX prop types for a given tag name, including reactive
 * attributes, events, and all our namespace extensions.
 *
 * @example
 * ```ts
 * type InputProps = Attrs<"input">;   // typed props for <input>
 * type DivProps   = Attrs<"div">;     // typed props for <div>
 * ```
 */
export type Attrs<K extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[K];

// ─ Our additions on top of every dom-expressions element ─────────────────────

/** Extra props injected into every intrinsic element beyond dom-expressions defaults. */
type OurProps = {
  ref?: (el: Element) => void;
  [slot: `slot:${string}`]: Computed<Child>;
  [cls: `class:${string}`]: Computed<boolean>;
  [sty: `style:${string}`]: Computed<string | null>;
  [prop: `prop:${string}`]: Computed<unknown>;
};

type WithOurProps<T> = T & OurProps;

// ─ JSX namespace ─────────────────────────────────────────────────────────────

export namespace JSX {
  export type Element = globalThis.Element | globalThis.DocumentFragment | null;
  export type ElementType = Child | Component;
  export interface ElementChildrenAttribute {
    children: {};
  }
  export interface IntrinsicAttributes {
    ref?: (el: Element) => void;
  }
  export type LibraryManagedAttributes<C, P> = ResolveProps<C, P>;
  type RegisteredElements = {
    [K in keyof CustomElementRegistry]: CustomElementRegistry[K] extends AnyElementCtor
      ? MaybeReactiveProps<ElementProps<CustomElementRegistry[K]>>
      : never;
  };

  export type IntrinsicElements = {
    [K in keyof DomJSX.IntrinsicElements]: WithOurProps<
      DomJSX.IntrinsicElements[K]
    >;
  } & RegisteredElements & {
      /** Unregistered custom elements (`x-foo`, `my-component`, …) — loose fallback. */
      [customElement: `${string}-${string}`]: WithOurProps<
        DomJSX.DOMAttributes<HTMLElement>
      > &
        Record<string, unknown>;
    };
}
