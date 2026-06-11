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
import type { MaybeReactive } from "../signals";

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

// ─ JSX namespaces — extras layered onto every intrinsic element ─────────────

/**
 * Namespaced JSX props added by elements-kit on top of dom-expressions.
 * All four are tag-aware via the element type `E`.
 *
 * - `ref` — callback invoked with the mounted element, typed as the concrete
 *   element class for intrinsics and registered custom elements.
 * - `class:foo` — open string + `MaybeReactive<boolean>`. Class names are
 *   user-defined CSS so the key stays open (no autocomplete possible).
 * - `style:cssProp` — keys mapped from `DomJSX.CSSProperties` (csstype's
 *   hyphenated property names) for autocomplete; value typed per-property.
 * - `prop:K` — inferred from `keyof E`. On `<div>` exposes
 *   `prop:className`, `prop:id`, etc. (from `HTMLDivElement`); on a
 *   registered custom element exposes its public fields too.
 *
 * `slot:foo` is NOT here — it's emitted per-element via `SlotsOf<C>` only
 * for elements that declare `[SLOTS]`. Plain HTML intrinsics don't accept
 * slot props (the runtime ignores them).
 */
type CssStyleKey =
  Extract<keyof DomJSX.CSSProperties, string> extends infer K
    ? K extends `-${string}`
      ? never
      : K
    : never;

type StyleNamespace = {
  [K in CssStyleKey as `style:${K}`]?: MaybeReactive<
    DomJSX.CSSProperties[K] | null
  >;
};

type PropNamespace<E> = {
  [K in keyof E as K extends string ? `prop:${K}` : never]?: MaybeReactive<
    E[K]
  >;
};

type JsxNamespaces<E extends Element = Element> = {
  ref?: (el: E) => void;
  [cls: `class:${string}`]: MaybeReactive<boolean>;
} & StyleNamespace &
  PropNamespace<E>;

// SVG-only namespaced attributes. The runtime routes any `xlink:*` / `xml:*`
// key through `setAttributeNS` (see src/jsx-runtime/properties.ts), but spec-
// wise these only apply to SVG content — so the types are only intersected
// onto IntrinsicElements whose concrete element type extends SVGElement.
type XlinkAttrs = {
  "xlink:href"?: MaybeReactive<string | undefined>;
  "xlink:title"?: MaybeReactive<string | undefined>;
  "xlink:show"?: MaybeReactive<
    "new" | "replace" | "embed" | "other" | "none" | undefined
  >;
  "xlink:role"?: MaybeReactive<string | undefined>;
  "xlink:type"?: MaybeReactive<
    | "simple"
    | "extended"
    | "locator"
    | "arc"
    | "resource"
    | "title"
    | undefined
  >;
  "xlink:arcrole"?: MaybeReactive<string | undefined>;
  "xlink:actuate"?: MaybeReactive<
    "onLoad" | "onRequest" | "other" | "none" | undefined
  >;
};

type XmlAttrs = {
  "xml:lang"?: MaybeReactive<string | undefined>;
  "xml:space"?: MaybeReactive<"default" | "preserve" | undefined>;
  "xml:base"?: MaybeReactive<string | undefined>;
};

type SvgNamespaceAttrs = XlinkAttrs & XmlAttrs;

type JsxNamespaceKeys =
  | "ref"
  | `class:${string}`
  | `style:${string}`
  | `prop:${string}`;

type WithJsxNamespaces<T, E extends Element = Element> = Omit<
  T,
  JsxNamespaceKeys
> &
  JsxNamespaces<E>;

type IntrinsicElementOf<T> = T extends { ref?: infer R | undefined }
  ? Extract<R, (el: any) => any> extends (el: infer E) => any
    ? E
    : Element
  : Element;

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
    [K in keyof CustomElementRegistry]: CustomElementRegistry[K] extends infer C extends AnyElementCtor
      ? WithJsxNamespaces<
          MaybeReactiveProps<ElementProps<C>>,
          InstanceType<C>
        >
      : never;
  };

  export type IntrinsicElements = {
    [K in keyof DomJSX.IntrinsicElements]: WithJsxNamespaces<
      DomJSX.IntrinsicElements[K],
      IntrinsicElementOf<DomJSX.IntrinsicElements[K]>
    > &
      (IntrinsicElementOf<DomJSX.IntrinsicElements[K]> extends SVGElement
        ? SvgNamespaceAttrs
        : {});
  } & RegisteredElements;
}
