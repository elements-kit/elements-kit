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
import type { ATTRIBUTES } from "./attributes";

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

// ─ Raw type extractors ────────────────────────────────────────────────────────
// Framework-agnostic views of a custom-element class, for use OUTSIDE
// elements-kit JSX (React/Svelte/Vue/Angular wrappers, vanilla DOM). The JSX
// presentation layer (named slot props, `on:*`, MaybeReactive wraps) is built on top
// of these in src/jsx-runtime/infer.ts.

/**
 * @internal Public instance keys of `I`: for `HTMLElement` subclasses the
 * inherited DOM surface is dropped; for plain classes `render` is dropped.
 * Shared by the raw extractors here and the JSX helpers in jsx-runtime.
 */
export type PublicPropKeys<I> = I extends HTMLElement
  ? Exclude<keyof I, keyof HTMLElement | symbol>
  : Exclude<keyof I, symbol | "render">;

type InstanceOfCtor<C> = C extends abstract new (...args: any[]) => infer I
  ? I
  : C;

/**
 * Settable property surface of a custom-element class (or instance) — the
 * user's public fields, all optional, without the inherited `HTMLElement`
 * surface. Slot-backed props (`@slot()` accessors) appear here as their
 * `Node | null` read type — assignment fills the slot.
 *
 * @example
 * ```ts
 * class XCounter extends HTMLElement { count = 0; }
 * type P = PropertiesOf<typeof XCounter>; // { count?: number }
 * ```
 */
export type PropertiesOf<C> =
  InstanceOfCtor<C> extends infer I
    ? { [K in PublicPropKeys<I> & string]?: I[K] }
    : never;

/**
 * Observed attributes of a custom-element class — every key of
 * `static [ATTRIBUTES]`, valued `string | null` (the raw HTML surface).
 *
 * @example
 * ```ts
 * type A = AttributesOf<typeof XRange>; // { min?: string | null; ... }
 * ```
 */
export type AttributesOf<C> = C extends { [ATTRIBUTES]: infer M }
  ? M extends Record<string, unknown>
    ? string extends keyof M
      ? {}
      : { [K in keyof M & string]?: string | null }
    : {}
  : {};

/**
 * Raw event map of a custom-element class — `static events` verbatim.
 * Shape it however your host needs: `addEventListener` typing, framework
 * event bindings, or an `HTMLElementEventMap` augmentation.
 *
 * @example
 * ```ts
 * type E = EventsOf<typeof XRange>; // { commit: CustomEvent<number> }
 * declare global {
 *   interface HTMLElementEventMap extends EventsOf<typeof XRange> {}
 * }
 * ```
 */
export type EventsOf<C> = C extends { events: infer E }
  ? E extends Record<string, Event>
    ? E
    : {}
  : {};

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
