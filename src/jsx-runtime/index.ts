import { Child, ComponentClass } from "./types";
import { createElement } from "./element";
import { $ref } from "./ref";
import type { JSX as DomJSX } from "dom-expressions/src/jsx-h";

export {
  createElement as jsx,
  createElement as jsxs,
  createElement as jsxDEV,
  createElement as h,
};
export { Fragment } from "../components/fragment";

// ─ Helpers: namespaced prop types ────────────────────────────────────────────

/** A value or a reactive zero-argument getter. */
export type FunctionMaybe<T> = DomJSX.FunctionMaybe<T>;

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
  [$ref]?: (el: Element) => void;
  [slot: `slot:${string}`]: Child;
  [cls: `class:${string}`]: FunctionMaybe<boolean>;
  [sty: `style:${string}`]: FunctionMaybe<string | null>;
  [prop: `prop:${string}`]: unknown;
};

type WithOurProps<T> = T & OurProps;

// ─ JSX namespace ─────────────────────────────────────────────────────────────

export namespace JSX {
  export type Element = globalThis.Element | globalThis.DocumentFragment | null;
  export type ElementType = Child | ComponentClass;
  export interface ElementChildrenAttribute {
    children: {};
  }

  export type IntrinsicElements = {
    [K in keyof DomJSX.IntrinsicElements]: WithOurProps<
      DomJSX.IntrinsicElements[K]
    >;
  } & {
    /** Custom elements (`x-foo`, `my-component`, …) get a loose typed fallback. */
    [customElement: `${string}-${string}`]: WithOurProps<
      DomJSX.DOMAttributes<HTMLElement>
    > &
      Record<string, unknown>;
  };
}
