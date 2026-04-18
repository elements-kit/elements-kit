import type { ATTRIBUTES, AttrChangeHandler } from "../attributes";
import type { SLOTS, Slots } from "../slot";
import type { Child, ComponentClass, ComponentInstance } from "./types";
import type { MaybeReactive } from "../signals";
import type { JSX as DomJSX } from "dom-expressions/src/jsx-h";

// ─ Constructor helper ─────────────────────────────────────────────────────────

type AnyElementCtor = abstract new (...args: any[]) => HTMLElement;

type Inst<C> = C extends abstract new (...args: any[]) => infer I ? I : never;

// ─ Props (public user-facing helpers) ────────────────────────────────────────

/**
 * When the instance extends `HTMLElement`, drop the DOM surface so only the
 * user's own fields remain. Plain classes keep all their keys.
 */
type PublicPropKeys<I> = I extends HTMLElement
  ? Exclude<keyof I, keyof HTMLElement | symbol>
  : Exclude<keyof I, symbol>;

/**
 * Public instance fields of `I` — all optional. For `HTMLElement` subclasses
 * the DOM surface is excluded; for plain classes, all own keys are kept.
 */
export type PropsOfInstance<I> = {
  [K in PublicPropKeys<I> & string]?: I[K];
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

/**
 * Wrap every prop in {@link MaybeReactive} so callers may pass either a
 * plain value or a reactive getter. Function-typed props (event handlers,
 * render callbacks) are wrapped too — the JSX runtime detects branded
 * signals/computed and re-binds on change. Optionality is preserved at the
 * key level — the `| undefined` stays at the prop, not inside the reactive.
 *
 * @template P — source prop object type.
 *
 * @example
 * ```ts
 * type Raw = { count: number; label?: string; onClick: (e: Event) => void };
 * type Wrapped = MaybeReactiveProps<Raw>;
 * // {
 * //   count:    MaybeReactive<number>;
 * //   label?:   MaybeReactive<string>;
 * //   onClick:  MaybeReactive<(e: Event) => void>;   // computed handlers OK
 * // }
 * ```
 *
 * @see {@link MaybeReactive}
 * @see {@link Props}
 */
export type MaybeReactiveProps<P> = {
  [K in keyof P]: undefined extends P[K]
    ? MaybeReactive<Exclude<P[K], undefined>> | undefined
    : MaybeReactive<P[K]>;
};

// ─ Internal composition pieces ───────────────────────────────────────────────

type InstancePropsOf<C> = Inst<C> extends infer I ? PropsOfInstance<I> : {};

type PropKeysOf<C> = keyof InstancePropsOf<C> & string;

type AttrMap<C> = C extends { [ATTRIBUTES]: infer M } ? M : never;

type HandlerValue<H> = H extends AttrChangeHandler<any> ? string | null : H;

type AttrsOf<C> =
  AttrMap<C> extends infer M
    ? M extends Record<string, unknown>
      ? {
          [K in Exclude<keyof M & string, PropKeysOf<C>>]?: MaybeReactive<
            HandlerValue<M[K]>
          >;
        }
      : {}
    : {};

type FlatPropsOf<C> = MaybeReactiveProps<InstancePropsOf<C>>;

type PropNamespacedOf<C> = {
  [K in PropKeysOf<C> as `prop:${K}`]?: NonNullable<InstancePropsOf<C>[K]>;
};

type EventMapOf<C> = C extends { events: infer E } ? E : {};

type Capitalize1<S extends string> = S extends `${infer H}${infer R}`
  ? `${Uppercase<H>}${R}`
  : S;

type EventsOf<C> =
  EventMapOf<C> extends infer E
    ? E extends Record<string, Event>
      ? {
          [K in keyof E & string as `on:${K}`]?: MaybeReactive<
            (ev: E[K]) => void
          >;
        } & {
          [K in keyof E & string as `on${Capitalize1<K>}`]?: MaybeReactive<
            (ev: E[K]) => void
          >;
        }
      : {}
    : {};

type SlotKeys<I> = I extends { [SLOTS]: Slots<infer K> } ? K : never;

type SlotsOf<C> =
  SlotKeys<Inst<C>> extends infer K
    ? [K] extends [string]
      ? { [P in K as `slot:${P}`]?: Child }
      : {}
    : {};

type ChildrenOf<C> = C extends { children: never } ? {} : { children?: Child };

type BaseDOMAttrs = DomJSX.DOMAttributes<HTMLElement>;

type Namespaces = {
  ref?: (el: Element) => void;
  [cls: `class:${string}`]: MaybeReactive<boolean>;
  [sty: `style:${string}`]: MaybeReactive<string | null>;
  [prop: `prop:${string}`]: unknown;
};

// ─ Public composed types ─────────────────────────────────────────────────────

/**
 * Full JSX prop type for a custom-element class (extends `HTMLElement`).
 *
 * Composes every surface the element can receive from JSX:
 * - **Attributes** — keys from `static [ATTRIBUTES]` (typed `MaybeReactive<string | null>`).
 *   Keys also present on the instance are dropped here so the flat key carries the property type.
 * - **Flat properties** — public instance fields, wrapped in `MaybeReactive`.
 * - **`prop:*`** — explicit property assignment for every field.
 * - **Events** — keys from `declare static events: { ... }` produce both
 *   `on:${K}` and `on${Capitalize<K>}` typed handlers.
 * - **Slots** — keys from `[SLOTS] = Slots.new([...] as const)` produce `slot:${K}`.
 * - **Children** — `children?: Child` unless `static children: never`.
 * - **DOM attrs** — the standard dom-expressions surface (`class`, `style`, `ref`, …).
 *
 * @template C — the custom-element class (constructor type).
 *
 * @example
 * ```ts
 * @attributes
 * class XRange extends HTMLElement {
 *   static [ATTRIBUTES]: Attributes<XRange> = { min(v) { this.min = +v! } };
 *   declare static events: { commit: CustomEvent<number> };
 *   [SLOTS] = Slots.new(["label"] as const);
 *   @reactive() min = 0;
 * }
 *
 * type Props = ElementProps<typeof XRange>;
 * // {
 * //   min?: MaybeReactive<number>;
 * //   "prop:min"?: number;
 * //   "on:commit"?: (e: CustomEvent<number>) => void;
 * //   onCommit?:   (e: CustomEvent<number>) => void;
 * //   "slot:label"?: Child;
 * //   children?: Child;
 * //   // …plus ref, class, class:*, style, style:*, standard DOM events
 * // }
 * ```
 *
 * @see {@link Props} for class-components / function components (no attr/event/slot synthesis).
 */
export type ElementProps<C extends AnyElementCtor> = BaseDOMAttrs &
  AttrsOf<C> &
  FlatPropsOf<C> &
  PropNamespacedOf<C> &
  EventsOf<C> &
  SlotsOf<C> &
  ChildrenOf<C> &
  Namespaces;

/**
 * Props of a class component that receives them via its constructor:
 * `class Comp { constructor(props: P) }`. Reads `ConstructorParameters[0]`.
 *
 * Use this when the component's props live on a constructor parameter rather
 * than on public instance fields. For instance-field components, use {@link Props}.
 *
 * @template C — the class constructor type (e.g. `typeof Card`).
 *
 * @example
 * ```ts
 * class Card {
 *   constructor(public props: { title: string; children?: Child }) {}
 *   render() { return <div>{this.props.title}</div>; }
 * }
 *
 * type P = ComponentProps<typeof Card>;
 * // { title: string; children?: Child }
 * ```
 *
 * @see {@link Props}
 */
export type ComponentProps<C extends ComponentClass<any>> =
  C extends ComponentClass<infer P> ? (P extends object ? P : {}) : {};

/**
 * Props for any component — class or function. Wraps every non-function
 * prop in {@link MaybeReactive} so callers may pass values or reactive getters.
 *
 * Branches by input shape:
 * - **Class constructor** (`typeof Cls`) → uses `PropsOfInstance<InstanceType<Cls>>`.
 * - **Function component** (`(props: P) => ...`) → uses the first parameter.
 * - **Class instance** (`Cls<T>`) → uses `PropsOfInstance<Cls<T>>` (useful when
 *   generics need to flow through — see the `For` example below).
 *
 * Does **not** synthesize `on:*`, `slot:*`, or attribute surface. For custom
 * elements that need those, use {@link ElementProps}.
 *
 * @template C — constructor, function, or instance.
 *
 * @example
 * ```ts
 * // 1. Class instance (lets a generic flow)
 * class For<T> { each: T[] = []; render() { return null } }
 * type ForProps<T> = Props<For<T>>;
 * //   ↑ { each?: MaybeReactive<T[]> }
 *
 * // 2. Function component
 * const Greeting = (_p: { name: string; excited?: boolean }) => null;
 * type GreetingProps = Props<typeof Greeting>;
 * //   ↑ { name: MaybeReactive<string>; excited?: MaybeReactive<boolean> }
 *
 * // 3. Class constructor
 * class Counter { count = 0; render() { return null } }
 * type CounterProps = Props<typeof Counter>;
 * //   ↑ { count?: MaybeReactive<number> }
 * ```
 *
 * @see {@link ElementProps} — custom elements (`HTMLElement` subclasses).
 * @see {@link ComponentProps} — constructor-param-based class components.
 * @see {@link MaybeReactiveProps}
 */
export type Props<C> = C extends abstract new (...args: any[]) => infer I
  ? MaybeReactiveProps<PropsOfInstance<I>>
  : C extends (props: infer P, ...rest: any[]) => any
    ? P extends object
      ? MaybeReactiveProps<P>
      : {}
    : MaybeReactiveProps<PropsOfInstance<C>>;

export type { AnyElementCtor, ComponentInstance };
