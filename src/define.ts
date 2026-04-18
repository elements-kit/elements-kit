/**
 * Registry of custom-element tags to their constructors.
 * Users augment this interface to add typed JSX support for their elements:
 *
 * @example
 * ```ts
 * declare module "elements-kit" {
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
 */
export function defineElement<
  Tag extends `${string}-${string}`,
  C extends AnyCtor,
>(tag: Tag, cls: C, options?: ElementDefinitionOptions): C {
  customElements.define(tag, cls, options);
  return cls;
}
