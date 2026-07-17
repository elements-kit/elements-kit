import type { Props } from "./infer";
import { createElement } from "./element";
import type { CustomElementRegistry } from "../custom-elements";
import type {
  AnyElementCtor,
  ElementProps,
  MaybeReactiveProps,
  ResolveProps,
} from "./infer";
import { SvgNamespaceAttrs, WithJsxNamespaces } from "./properties";
import type { JSX as DomJSX } from "dom-expressions/src/jsx";
import { Children } from "./children";

export type { ElementProps, PropsOf, RawProps, Props, Require } from "./infer";

export type { MaybeReactive } from "../signals";

export {
  createElement as jsx,
  createElement as jsxs,
  createElement as jsxDEV,
  createElement as h,
};
export { Fragment } from "./fragment";

type IntrinsicElementOf<T> = T extends { ref?: infer R | undefined }
  ? Extract<R, (el: any) => any> extends (el: infer E) => any
    ? E
    : Element
  : Element;

export namespace JSX {
  export type Element = globalThis.Element | globalThis.DocumentFragment;
  export type ElementClass = {
    render(): JSX.Element | null;
  };
  export type ElementType =
    | string
    | JSX.Element
    | (new (props: any) => JSX.ElementClass)
    | ((props: any) => JSX.Element | null);
  export interface ElementChildrenAttribute {
    children: {};
  }
  export interface IntrinsicAttributes {
    ref?: (el: Element) => void;
  }

  export type LibraryManagedAttributes<C, P> = ResolveProps<C, P>;
  type RegisteredElements = {
    [K in keyof CustomElementRegistry]: CustomElementRegistry[K] extends infer C extends
      AnyElementCtor
      ? WithJsxNamespaces<MaybeReactiveProps<ElementProps<C>>, InstanceType<C>>
      : never;
  };

  // dom-expressions' `jsx` schema types attributes as PLAIN values (its
  // compiled runtime wraps expressions itself). elements-kit has no compiler,
  // so the reactive layer is applied here: every attribute widens to
  // value-or-getter, and `children` is replaced with our `Children` (which
  // admits getters, signals, and arrays).
  export type IntrinsicElements = {
    // `ref` stays outside the reactive wrap: the runtime invokes it once with
    // the element (never unwraps a getter), and wrapping it would intersect
    // badly with IntrinsicAttributes.ref, killing inline-arrow param inference.
    [K in keyof DomJSX.IntrinsicElements]: MaybeReactiveProps<
      WithJsxNamespaces<
        DomJSX.IntrinsicElements[K],
        IntrinsicElementOf<DomJSX.IntrinsicElements[K]>
      >
    > & {
      ref?: (el: IntrinsicElementOf<DomJSX.IntrinsicElements[K]>) => void;
      children?: Children;
    } & (IntrinsicElementOf<DomJSX.IntrinsicElements[K]> extends SVGElement
        ? SvgNamespaceAttrs
        : {});
  } & RegisteredElements;
}

/** A class whose constructor returns a ComponentInstance. */
export type ComponentClass<P extends Record<PropertyKey, unknown> = any> = new (
  props: P,
) => JSX.ElementClass;
export type ComponentFn<P extends Record<PropertyKey, unknown> = any> = (
  props: Props<P>,
) => JSX.Element | null;
