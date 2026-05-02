// Typed JSX for custom elements goes through `CustomElementRegistry` below.
// elements-kit uses `jsxImportSource: "elements-kit"`, so global `JSX`
// namespace augmentations do not merge with the runtime's own namespace and
// have no effect. Augment this interface instead — it works for any tag,
// regardless of whether you register with `defineElement` or call
// `customElements.define` directly.
//
// ```ts
// declare module "elements-kit/custom-elements" {
//   interface CustomElementRegistry {
//     "x-counter": typeof XCounter;
//   }
// }
// ```

/**
 * Registry of custom-element tags to their constructors.
 * Users augment this interface to add typed JSX support for their elements:
 *
 * @example
 * ```ts
 * declare module "elements-kit/custom-elements" {
 *   interface CustomElementRegistry {
 *     "x-range": typeof XRange;
 *   }
 * }
 * ```
 */
export interface CustomElementRegistry {}

type AnyCtor = CustomElementConstructor;

/**
 * Register a custom element with the browser and return its class.
 * Pair with a module augmentation of `CustomElementRegistry` to get typed JSX.
 *
 * @example
 * ```tsx
 * import { defineElement } from "elements-kit/custom-elements";
 *
 * class XCounter extends HTMLElement {}
 *
 * defineElement("x-counter", XCounter);
 *
 * declare module "elements-kit/custom-elements" {
 *   interface CustomElementRegistry {
 *     "x-counter": typeof XCounter;
 *   }
 * }
 *
 * // JSX now gets typed props + typed ref
 * // <x-counter />
 * ```
 */
export function defineElement<
  Tag extends `${string}-${string}`,
  C extends AnyCtor,
>(tag: Tag, cls: C, options?: ElementDefinitionOptions): C {
  customElements.define(tag, cls, options);
  return cls;
}
