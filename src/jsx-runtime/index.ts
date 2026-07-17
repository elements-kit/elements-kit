import type { Props } from "./infer";
import { createElement, DOMIntrinsicElements, DOMElements } from "./element";
import type { CustomElementRegistry } from "../custom-elements";
import type {
  AnyElementCtor,
  ElementProps,
  MaybeReactiveProps,
  ResolveProps,
} from "./infer";
import { SvgNamespaceAttrs, WithJsxNamespaces } from "./properties";
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

  export type IntrinsicElements = {
    [K in keyof DOMIntrinsicElements]: MaybeReactiveProps<
      WithJsxNamespaces<DOMIntrinsicElements[K], DOMElements[K]>
    > & {
      ref?: (el: DOMElements[K]) => void;
      children?: Children;
    } & (DOMElements[K] extends SVGElement ? SvgNamespaceAttrs : {});
  } & RegisteredElements;
}

/** A class whose constructor returns a ComponentInstance. */
export type ComponentClass<P extends Record<PropertyKey, unknown> = any> = new (
  props: P,
) => JSX.ElementClass;
export type ComponentFn<P extends Record<PropertyKey, unknown> = any> = (
  props: Props<P>,
) => JSX.Element | null;
