/**
 * Registry of custom-element tags to their constructors.
 * Users augment this interface to add typed JSX support for their elements.
 *
 * The interface lives in the global `ElementsKit` namespace so augmentations
 * propagate cleanly through type-bundle chunk splits — augmenting a module
 * subpath would not always merge with internal references inside the JSX
 * namespace's `IntrinsicElements`.
 *
 * @example
 * ```ts
 * declare global {
 *   namespace ElementsKit {
 *     interface CustomElementRegistry {
 *       "x-range": typeof XRange;
 *     }
 *   }
 * }
 * ```
 */
declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {}
  }
}
export type CustomElementRegistry = ElementsKit.CustomElementRegistry;

type AnyCtor = CustomElementConstructor;

/**
 * Register a custom element with the browser and return its class.
 * Pair with an augmentation of `ElementsKit.CustomElementRegistry` to get typed JSX.
 *
 * @example
 * ```tsx
 * import { defineElement } from "elements-kit/custom-elements";
 *
 * class XCounter extends HTMLElement {}
 *
 * defineElement("x-counter", XCounter);
 *
 * declare global {
 *   namespace ElementsKit {
 *     interface CustomElementRegistry {
 *       "x-counter": typeof XCounter;
 *     }
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
