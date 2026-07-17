import type { ATTRIBUTES, AttrChangeHandler } from "../attributes";
import type { SLOTS, Slot } from "../slot";
import type { Computed, MaybeReactive } from "../signals";
import type { JSX as DomJSX } from "dom-expressions/src/jsx";
import type { JSX } from "elements-kit/jsx-runtime";
import type { Children } from "./children";

// ─ Props (public user-facing helpers) ────────────────────────────────────────

/**
 * When the instance extends `HTMLElement`, drop the DOM surface so only the
 * user's own fields remain. Plain class components also drop `render` — it's
 * the internal rendering method, not a JSX prop.
 */
type PublicPropKeys<I> = I extends HTMLElement
  ? Exclude<keyof I, keyof HTMLElement | symbol>
  : Exclude<keyof I, symbol | "render">;

/**
 * Public instance fields of `I` — all optional. For `HTMLElement` subclasses
 * the DOM surface is excluded; for plain classes, all own keys are kept.
 * `Slot`-typed fields are mapped to `Child`.
 */
export type InstanceProps<I> = {
  [K in PublicPropKeys<I> & string]?: I[K] extends Slot ? Children : I[K];
};

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
 * - branded `Props<P>` param (function components) → wrap the raw `P`
 * - empty constructor param (instance-field classes) → wrap `PropsOf<C>`
 * - non-empty constructor param → pass through (preserves `For<T>` inference)
 */
export type ResolveProps<C, P, NN = NonNullable<P>> = NN extends {
  readonly [RAW_PROPS]?: infer Raw;
}
  ? MaybeReactiveProps<Raw>
  : [keyof NN] extends [never]
    ? C extends JSX.ElementType | JSX.ElementClass
      ? MaybeReactiveProps<PropsOf<C>>
      : {}
    : NN;

// ─ Internal composition pieces ───────────────────────────────────────────────

type InstancePropsOf<C> = InstanceProps<InstanceOf<C>>;

type PropKeysOf<C> = keyof InstancePropsOf<C> & string;

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
  [K in PropKeysOf<C> as `prop:${K}`]?: NonNullable<InstancePropsOf<C>[K]>;
};

type EventMapOf<C> = C extends { events: infer E } ? E : {};

// Only `on:event` — the runtime attaches listeners solely through the `on:`
// namespace (see applyProps); a camelCase `onEvent` key would silently fall
// through to setAttribute, so it must not be typed as valid.
type EventsOf<C> =
  EventMapOf<C> extends infer E
    ? E extends Record<string, Event>
      ? {
          [K in keyof E & string as `on:${K}`]?: (ev: E[K]) => void;
        }
      : {}
    : {};

type SlotKeys<I> = I extends { [SLOTS]: infer S }
  ? Extract<keyof S, string>
  : never;

type SlotsOf<C> =
  SlotKeys<InstanceOf<C>> extends infer K
    ? [K] extends [string]
      ? { [P in K as `slot:${P}`]?: Children }
      : {}
    : {};

type ChildrenOf<C> = C extends { children: never }
  ? {}
  : { children?: Children };

type BaseDOMAttrs = DomJSX.DOMAttributes<HTMLElement>;

// Namespaces (`class:`, `style:`, `prop:`, `slot:`, `ref`) are added at the
// JSX layer via `OurProps` in [src/jsx-runtime/index.ts]. They're not part of
// the raw `ElementProps<C>` shape — that one only carries the element's
// declared surface (attrs, instance fields, events, slots, children).

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
 * - **Slots** — keys from `[SLOTS] = { ... } as const` produce `slot:${K}`.
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
 *   [SLOTS] = { label: new Slot() } as const;
 *   \@reactive() min = 0;
 * }
 *
 * type Props = ElementProps<typeof XRange>;
 * // {
 * //   min?: MaybeReactive<number>;
 * //   "prop:min"?: number;
 * //   "on:commit"?: (e: CustomEvent<number>) => void;
 * //   "slot:label"?: Child;
 * //   children?: Child;
 * //   // …plus ref, class, class:*, style, style:*, standard DOM events
 * // }
 * ```
 *
 * @see {@link PropsOf} for class-components / function components (no attr/event/slot synthesis).
 */
export type ElementProps<C extends AnyElementCtor> = BaseDOMAttrs &
  AttrsOf<C> &
  InstancePropsOf<C> &
  PropNamespacedOf<C> &
  EventsOf<C> &
  SlotsOf<C> &
  ChildrenOf<C>;

/**
 * Props for any component — class or function.
 *
 * Branches by input shape:
 * - **Class constructor** (`typeof Cls`) → uses `InstanceProps<InstanceType<Cls>>`.
 * - **Function component** (`(props: P) => ...`) → uses the first parameter.
 * - **Class instance** (`Cls<T>`) → uses `InstanceProps<Cls<T>>` (useful when
 *   generics need to flow through — see the `For` example below).
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
export type PropsOf<T extends JSX.ElementType | JSX.ElementClass> = (T extends (
  props: infer P,
  ...rest: any[]
) => any
  ? P extends object
    ? RawProps<P>
    : {}
  : InstanceProps<InstanceOf<T>>) &
  SlotsOf<T>;

// ─ Constructor helper ─────────────────────────────────────────────────────────

export type AnyElementCtor = abstract new (...args: any[]) => HTMLElement;

/**
 * Instance type of a constructor; non-constructors pass through unchanged —
 * lets `PropsOf<>`/`SlotsOf<>` accept both `typeof Cls` and `Cls`.
 */
type InstanceOf<C> = C extends abstract new (...args: any[]) => infer I ? I : C;
