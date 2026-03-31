import { PrimitiveNodeType, resolveNode } from "./lib";
import { effect, isReactive } from "./signals";
import { Slot } from "./slot";

export const DISPOSABLES: unique symbol = Symbol("disposables");
export const DISPOSE: unique symbol = Symbol("dispose");
export const VALUE: unique symbol = Symbol("value");
export const EFFECT: unique symbol = Symbol("effect");

export class ElementBuilder<T extends Element = Element> {
  /** The underlying DOM element */
  private [VALUE]: T;
  // TODO: should we track effects separately?
  /** A set of cleanup functions to run when disposing the element */
  private [DISPOSABLES] = new Set<() => void>();
  /** Dispose the reactive element and run all cleanup functions */
  [DISPOSE]() {
    this[DISPOSABLES].forEach((dispose) => dispose());
    this[DISPOSABLES].clear();
  }
  [EFFECT](fn: () => void) {
    this[DISPOSABLES].add(effect(fn));
    return this;
  }
  private constructor(el: T) {
    this[VALUE] = el;
  }

  static create<T extends Element>(el: T): ReactiveElement<T> {
    const builder = new ElementBuilder<T>(el);
    return new Proxy(builder.ref, {
      apply(_target, _thisArg, argArray) {
        return Reflect.apply(builder.ref, builder, argArray);
      },
      get(_target, key, receiver) {
        const el = builder[VALUE];
        if (key in builder) {
          return Reflect.get(builder, key, receiver);
        }

        return setterOrValue(receiver as ElementBuilder<T>, el, key);
      },
    }) as unknown as ReactiveElement<T>;
  }

  children(
    ...children: ValueOrReactive<ElementBuilder | Node | string | number>[]
  ) {
    const el = this[VALUE];
    if (children.length === 0) return el;

    children.forEach((child) => {
      if (isReactive(child)) {
        const slot = Slot.new();
        el.appendChild(slot());

        return this[EFFECT](() => {
          const value = toNode(child());
          slot.set(value);
        });
      }
      el.appendChild(toNode(child));
    });

    return el;
  }

  ref(): T;
  ref(apply: (ref: T) => void | (() => void)): this;
  ref(apply?: (ref: T) => void | (() => void)) {
    if (!apply) return this[VALUE];
    const result = apply(this[VALUE]);
    if (typeof result === "function") {
      this[DISPOSABLES].add(result);
    }
    return this;
  }

  on<K extends keyof HTMLElementEventMap>(
    eventType: K,
    listener: (ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ) {
    this[VALUE].addEventListener(eventType, listener, options);
    this[DISPOSABLES].add(() => {
      this[VALUE].removeEventListener(eventType, listener, options);
    });
    return this;
  }
}

class ChainContext<T> {
  readonly builder: ElementBuilder;
  readonly chain: T;
  readonly key: string | symbol;
  constructor(builder: ElementBuilder, chain: T, key: string | symbol) {
    this.builder = builder;
    this.chain = chain;
    this.key = key;
  }

  setter(value) {
    if (isReactive(value)) {
      this.builder[DISPOSABLES].add(
        effect(() => {
          this.chain[this.key] = value();
        }),
      );
      return this.builder;
    }
    this.chain[this.key] = value;
    return this.builder;
  }
}

function setterOrValue<T extends object = object>(
  builder: ElementBuilder,
  chainParent: T,
  key: string | symbol,
) {
  const chain = chainParent[key];
  const context = new ChainContext(builder, chainParent, key);

  return new Proxy(context.setter.bind(context), {
    apply(target, _thisArg, argArray) {
      return target.apply(builder, argArray);
    },
    get(_, subkey) {
      if (isObject(chain)) {
        return setterOrValue(builder, chain, subkey);
      }
      return chain[subkey];
    },
  });
}

export function toNode(c: ElementBuilder | PrimitiveNodeType): Node {
  if (c instanceof ElementBuilder) return c.ref();
  return resolveNode(c);
}

function isObject(v: unknown): v is Record<string | symbol, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function builder<T extends Element>(el: T) {
  return ElementBuilder.create(el) as unknown as ReactiveElementOf<T>;
}

/**
 * Callable overloads matching the Proxy apply trap → ref() behavior.
 * Calling a reactive element as a function delegates to ref():
 *   el()            → returns the raw DOM element
 *   el((ref) => {}) → applies a side-effect, returns the builder for chaining
 */
interface RefCallable<T extends Element> {
  (): T;
  (apply: (ref: T) => void | (() => void)): this;
}

export type ReactiveElement<T extends Element> = ElementBuilder<T> &
  RefCallable<T>;

// NOTE: typescript doens't allow to extract setter argument types directly
// check: https://github.com/microsoft/TypeScript/issues/21759
export type ValueOrReactive<T> = (() => T) | T;

type ValueOrReactiveArray<T extends any[]> = {
  [K in keyof T]: ValueOrReactive<T[K]> | T[K];
};

/**
 * Filter keys that are writable (exclude readonly and getter-only).
 */
type WritableKeys<T> = {
  [K in keyof T]: (<U>() => U extends { [Q in K]: T[K] } ? 1 : 2) extends <
    U,
  >() => U extends { readonly [Q in K]: T[K] } ? 1 : 2
    ? never
    : K;
}[keyof T];

/**
 * Extracts the object chaining part of ReactiveBuilder.
 * Used for properties like `style` where you can do both:
 *   .style("padding: 20px;")     // setter
 *   .style.padding("20px")       // sub-property chaining
 */
export type Chain<R, T> = T extends object
  ? {
      [K in WritableKeys<T>]: Builder<R, T[K]>;
    }
  : {};

export type Builder<R, T = R> = T extends (...args: infer U) => unknown
  ? (...value: ValueOrReactiveArray<U>) => R
  : (value?: ValueOrReactive<T>) => R;

/**
 * Types eligible for sub-property chaining (e.g., `.style.padding("20px")`).
 */
type ChainableType =
  | CSSStyleDeclaration
  | DOMTokenList
  | DOMStringMap
  | StylePropertyMap;

/**
 * Filters keys to only writable data properties.
 * Excludes methods (function-valued properties) and event handlers (`on*`).
 */
type DataPropertyKeys<T> = {
  [K in keyof T]: K extends `on${string}`
    ? never
    : T[K] extends (...args: any[]) => any
      ? never
      : K;
}[keyof T];

/**
 * Reactive setter for a single property.
 * Chainable types (CSSStyleDeclaration, DOMTokenList, etc.) get both
 * sub-property chaining and direct setter support.
 */
type ReactiveSetter<R, T> = T extends ChainableType
  ? Chain<R, T> & ((value: ValueOrReactive<T>) => R)
  : (value: ValueOrReactive<T>) => R;

/**
 * A fully-typed reactive element builder for any Element type.
 * Automatically maps all writable data properties into reactive setters.
 *
 * Use this for custom elements instead of needing generated builder interfaces.
 *
 * @example
 * ```ts
 * import { reactive, type ReactiveElementOf } from "elements-kit";
 *
 * class MyElement extends HTMLElement {
 *   greeting = "hello";
 * }
 * customElements.define("my-element", MyElement);
 *
 * const myEl = () =>
 *   reactive(document.createElement("my-element") as MyElement);
 *
 * // Full type support for both own and inherited properties:
 * myEl().greeting("world").style.padding("20px").id("main");
 * ```
 */
export type ReactiveElementOf<T extends Element> = ElementBuilder<T> & {
  [K in WritableKeys<T> & DataPropertyKeys<T> & keyof T]: ReactiveSetter<
    ReactiveElementOf<T>,
    T[K]
  >;
};
