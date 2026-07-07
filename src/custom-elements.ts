// Typed JSX for custom elements goes through `ElementsKit.CustomElementRegistry`
// below. elements-kit uses `jsxImportSource: "elements-kit"`, so global `JSX`
// namespace augmentations do not merge with the runtime's own namespace and
// have no effect. Augment the global namespace below — it works for any tag,
// regardless of whether you register with `defineElement` or call
// `customElements.define` directly.
//
// ```ts
// declare global {
//   namespace ElementsKit {
//     interface CustomElementRegistry {
//       "x-counter": typeof XCounter;
//     }
//   }
// }
// ```

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
// Instance types of every registry entry, keyed by tag. Feeding these into
// `HTMLElementTagNameMap` types the DOM surface for registered elements —
// `querySelector("x-range")`, `querySelectorAll`, `createElement`, … return
// the concrete element class instead of bare `Element`. Later augmentations
// of `CustomElementRegistry` merge before checking, so they're picked up too.
type RegisteredElementInstances = {
  [K in keyof ElementsKit.CustomElementRegistry]: ElementsKit.CustomElementRegistry[K] extends abstract new (
    ...args: any[]
  ) => infer I
    ? I
    : never;
};

declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {}
  }
  interface HTMLElementTagNameMap extends RegisteredElementInstances {}
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
