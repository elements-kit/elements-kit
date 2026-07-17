import type { ATTRIBUTES, AttrChangeHandler } from "../attributes";
import type { Computed, MaybeReactive } from "../signals";
import type { JSX as DomJSX } from "dom-expressions/src/jsx";
import type { JSX } from "elements-kit/jsx-runtime";
import type { Children } from "./children";

// ─ Props (public user-facing helpers) ────────────────────────────────────────

import type {
  PropertiesOf,
  EventsOf as RawEventsOf,
} from "../custom-elements";

/**
 * Promote keys `K` of `P` to required; leave the rest unchanged.
 *
 * @template P — the prop object type.
 * @template K — the keys to make required.
 *
 * @example
 * ```ts
 * type Optional = { a?: number; b?: string; c?: boolean };
 * type AB = Require<Optional, "a" | "b">;
 * // { a: number; b: string; c?: boolean }
 * ```
 */
export type Require<P, K extends keyof P> = { [X in K]-?: P[X] } & Omit<P, K>;

declare const RAW_PROPS: unique symbol;

export type Props<P> = {
  readonly [K in keyof P]: Computed<P[K]>;
} & { readonly [RAW_PROPS]?: P };

/** Recover the raw prop shape `P` from a `Props<P>`. */
export type RawProps<R> = R extends { readonly [RAW_PROPS]?: infer P } ? P : R;

/**
 * Caller-facing wrap: each key accepts a plain value OR a reactive getter.
 * The JSX checker applies it automatically to component props; name it
 * directly when typing a call-site shape by hand (e.g. a class component's
 * constructor param, like `For`'s). Function-typed props are wrapped too
 * (`Computed<F>` is zero-arg, so TS still picks the handler signature by
 * arity for inline arrows). `Signal<F>` must never be added explicitly — its
 * one-arg `Updater` half would collapse inline arrow params to implicit any.
 */
export type MaybeReactiveProps<P> = {
  [K in keyof P]: undefined extends P[K]
    ? MaybeReactive<Exclude<P[K], undefined>> | undefined
    : MaybeReactive<P[K]>;
};

/**
 * @internal Call-site prop resolution for `JSX.LibraryManagedAttributes`:
 * - empty param (instance-field classes, no ctor) → wrap `PropsOf<C>`
 * - branded `Props<P>` param (function components) → wrap the raw `P`
 * - non-empty constructor param → pass through (preserves `For<T>` inference)
 *
 * Emptiness is checked FIRST: `{}` structurally matches the optional brand
 * (`{} extends { [RAW_PROPS]?: infer Raw }` with `Raw = unknown`), which
 * would silently type every no-ctor class as `MaybeReactiveProps<unknown>`
 * (= `{}`, accepting anything). A real `Props<P>` is never empty — its
 * `keyof` always contains the brand symbol.
 */
export type ResolveProps<C, P, NN = NonNullable<P>> = [keyof NN] extends [never]
  ? C extends JSX.ElementType | JSX.ElementClass
    ? MaybeReactiveProps<PropsOf<C>>
    : {}
  : NN extends {
        readonly [RAW_PROPS]?: infer Raw;
      }
    ? MaybeReactiveProps<Raw>
    : NN;

// ─ Internal composition pieces ───────────────────────────────────────────────

type PropKeysOf<C> = keyof PropertiesOf<C> & string;

// Defaults to `{}` (not `never`) for classes without `[ATTRIBUTES]` — `never`
// would poison downstream conditional types via distribution, collapsing the
// whole `ElementProps<>` intersection to `never`.
type AttrMap<C> = C extends { [ATTRIBUTES]: infer M } ? M : {};

type HandlerValue<H> = H extends AttrChangeHandler<any> ? string | null : H;

// Bail out when the attribute map is an open `Record<string, ...>` — keyof is
// `string` (no literal keys to enumerate). Users get typed attribute slots
// only when literal keys are preserved via `satisfies Attributes<T>`.
// Without this guard, `Exclude<string, "min" | …>` collapses to `string` and
// produces an index signature that overrides the typed property slots from
// `FlatPropsOf`, breaking the property-over-attribute precedence rule.
type AttrsOf<C> =
  AttrMap<C> extends infer M
    ? M extends Record<string, unknown>
      ? string extends keyof M
        ? {}
        : {
            [K in Exclude<keyof M & string, PropKeysOf<C>>]?: HandlerValue<
              M[K]
            >;
          }
      : {}
    : {};

type PropNamespacedOf<C> = {
  [K in PropKeysOf<C> as `prop:${K}`]?: NonNullable<PropertiesOf<C>[K]>;
};

// Only `on:event` — the runtime attaches listeners solely through the `on:`
// namespace (see applyProps); a camelCase `onEvent` key would silently fall
// through to setAttribute, so it must not be typed as valid. Keys come from
// the raw `EventsOf` extractor (custom-elements.ts).
type JsxEventsOf<C> = {
  [K in keyof RawEventsOf<C> & string as `on:${K}`]?: (
    ev: RawEventsOf<C>[K],
  ) => void;
};

type ChildrenOf<C> = C extends { children: never }
  ? {}
  : { children?: Children };

type BaseDOMAttrs = DomJSX.DOMAttributes<HTMLElement>;

// Namespaces (`class:`, `style:`, `prop:`, `ref`) are added at the
// JSX layer via `OurProps` in [src/jsx-runtime/index.ts]. They're not part of
// the raw `ElementProps<C>` shape — that one only carries the element's
// declared surface (attrs, instance fields, events, children).

// ─ Public composed types ─────────────────────────────────────────────────────

/**
 * Full JSX prop type for a custom-element class (extends `HTMLElement`).
 *
 * Composes every surface the element can receive from JSX:
 * - **Attributes** — keys from `static [ATTRIBUTES]` (typed `MaybeReactive<string | null>`).
 *   Keys also present on the instance are dropped here so the flat key carries the property type.
 * - **Flat properties** — public instance fields, wrapped in `MaybeReactive`.
 * - **`prop:*`** — explicit property assignment for every field.
 * - **Events** — keys from `declare static events: { ... }` produce
 *   `on:${K}` typed handlers (the only event syntax the runtime attaches).
 * - **Children** — `children?: Child` unless `static children: never`.
 * - **DOM attrs** — the standard dom-expressions surface (`class`, `style`, `ref`, …).
 *
 * @template C — the custom-element class (constructor type).
 *
 * @example
 * ```ts
 * \@attributes
 * class XRange extends HTMLElement {
 *   static [ATTRIBUTES]: Attributes<XRange> = { min(v) { this.min = +v! } };
 *   declare static events: { commit: CustomEvent<number> };
 *   #slot = new Slot();
 *   get label() { return this.#slot.get(); }
 *   set label(value: Node) { this.#slot.set(value) }
 *   \@reactive() min = 0;
 * }
 *
 * type Props = ElementProps<typeof XRange>;
 * // {
 * //   min?: MaybeReactive<number>;
 * //   "prop:min"?: number;
 * //   "on:commit"?: (e: CustomEvent<number>) => void;
 * //   label?: Node
 * //   children?: Node;
 * //   // …plus ref, class, class:*, style, style:*, standard DOM events
 * // }
 * ```
 *
 * @see {@link PropsOf} for class-components / function components (no attr/event synthesis).
 */
export type ElementProps<C extends AnyElementCtor> = BaseDOMAttrs &
  AttrsOf<C> &
  PropertiesOf<C> &
  PropNamespacedOf<C> &
  JsxEventsOf<C> &
  ChildrenOf<C>;

/**
 * Props for any component — class or function.
 *
 * The combination of the two specialised helpers:
 * - **Custom-element constructor** (`typeof Cls`, `Cls extends HTMLElement`)
 *   → `ElementProps<Cls>` — the full JSX surface (attrs, `prop:*`, `on:*`,children).
 * - **Everything else** (function component, class component ctor or
 *   instance) → `ComponentProps<T>` — the raw prop shape.
 *
 * @template T — constructor, function, or instance.
 *
 * @example
 * ```ts
 * // 1. Class instance (lets a generic flow)
 * class For<T> { each: T[] = []; render() { return null } }
 * type ForProps<T> = PropsOf<For<T>>;
 * //   ↑ { each?: T[] }
 *
 * // 2. Function component
 * const Greeting = (_p: { name: string; excited?: boolean }) => null;
 * type GreetingProps = PropsOf<typeof Greeting>;
 * //   ↑ { name: string; excited?: boolean }
 *
 * // 3. Class constructor
 * class Counter { count = 0; render() { return null } }
 * type CounterProps = PropsOf<typeof Counter>;
 * //   ↑ { count?: number }
 * ```
 */
export type PropsOf<
  T extends JSX.ElementType | JSX.ElementClass | AnyElementCtor,
> = T extends AnyElementCtor
  ? ElementProps<T>
  : T extends JSX.ElementType | JSX.ElementClass
    ? ComponentProps<T>
    : never;

/**
 * Raw props of a function or class COMPONENT (not a custom element):
 * function components use the first parameter (`RawProps` unwraps a branded
 * `Props<P>`); classes use their public instance fields. The custom-element half of `PropsOf` is `ElementProps`.
 */
export type ComponentProps<T extends JSX.ElementType | JSX.ElementClass> =
  T extends (props: infer P, ...rest: any[]) => any
    ? P extends object
      ? RawProps<P>
      : {}
    : PropertiesOf<T>;

// ─ Constructor helper ─────────────────────────────────────────────────────────

export type AnyElementCtor = abstract new (...args: any[]) => HTMLElement;
