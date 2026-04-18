export {
  signal,
  isSignal,
  computed,
  isComputed,
  effect,
  isEffect,
  effectScope,
  isEffectScope,
  trigger,
  batch,
  onCleanup,
  untracked,
  SIGNAL,
  COMPUTED,
  EFFECT,
  EFFECT_SCOPE,
} from "./lib";
import { isSignal, isComputed, signal } from "./lib";
import "../polyfill";
export function isReactive<T>(value: MaybeReactive<T>): value is () => T {
  return isSignal(value as () => T) || isComputed(value as () => T);
}

export type Updater<T> = (value: T) => void;
export type Computed<T> = () => T;
export type Signal<T> = Updater<T> & Computed<T>;

/**
 * A decorator that makes a class field reactive by automatically wrapping its value in a signal.
 *
 * The field behaves like a normal property (get/set) but reactivity is tracked under the hood.
 * Any reads will subscribe to the signal and any writes will trigger updates.
 *
 * @example
 * ```ts
 * class Counter {
 *   @reactive()
 *   count: number = 0;
 * }
 *
 * const counter = new Counter();
 * counter.count++;        // Triggers reactivity
 * console.log(counter.count); // Subscribes to changes
 * ```
 *
 * @remarks
 * Equivalent to manually creating a private signal and getter/setter:
 * ```ts
 * class Counter {
 *   #count = signal(0);
 *   get count() { return this.#count(); }
 *   set count(value) { this.#count(value); }
 * }
 * ```
 */
export function reactive<This extends object, Value>(
  source?: (self: This) => Signal<Value>,
) {
  const signalStore = new WeakMap<This, Signal<Value>>();

  return (
    _target: unknown,
    context: ClassFieldDecoratorContext<This, Value>,
  ) => {
    // addInitializer runs after the field's [[DefineOwnProperty]] step, so the
    // accessor is installed on top of the data property the runtime just wrote.
    context.addInitializer(function (this: This) {
      const sig = signalStore.get(this)!;
      const writable = !isComputed(sig);
      Object.defineProperty(this, context.name, {
        get(): Value {
          return sig();
        },
        ...(writable && {
          set(value: Value) {
            sig(value);
          },
        }),
        enumerable: true,
        configurable: true,
      });
    });

    return function (this: This, initialValue: Value): Value {
      signalStore.set(this, source ? source(this) : signal(initialValue));
      return initialValue;
    };
  };
}

/**
 * A value that may be static or reactive. Accepts a plain `T` or a
 * zero-arg getter (`() => T`) — typically a `signal` or `computed`.
 *
 * Used across the library anywhere a prop or attribute may be bound to
 * reactive state. Resolve with {@link resolve}, detect with {@link isReactive}.
 *
 * @template T — the value type.
 *
 * @example
 * ```ts
 * import { signal, computed } from "elements-kit/signals";
 *
 * const count = signal(0);
 * const double = computed(() => count() * 2);
 *
 * const a: MaybeReactive<number> = 5;       // static
 * const b: MaybeReactive<number> = count;   // signal (getter)
 * const c: MaybeReactive<number> = double;  // computed (getter)
 * ```
 */
export type MaybeReactive<T> = T | Computed<T>;

/**
 * Resolve a {@link MaybeReactive} to its current value. Calls the getter
 * when reactive; returns the value as-is when static.
 *
 * @example
 * ```ts
 * resolve(5);              // 5
 * resolve(() => count());  // current count value
 * ```
 */
export function resolve<T>(value: MaybeReactive<T>): T {
  return isReactive(value) ? value() : value;
}

/**
 * Turn a reactive-props object into a bag of per-key getters. Callers may
 * pass values or reactive sources (`signal`, `computed`); reading
 * `props.name()` inside an effect or JSX getter subscribes to whatever
 * drives it. Static values become stable thunks, signals and computed pass
 * through unchanged — so identity is preserved (`props.name === props.name`).
 *
 * @example
 * ```tsx
 * import { resolveProps } from "elements-kit/signals";
 *
 * function Greeting(raw: MaybeReactiveProps<{ name: string; excited?: boolean }>) {
 *   const props = resolveProps(raw);
 *   return (
 *     <p>
 *       Hello, {props.name}
 *       {() => (props.excited() ? "!" : ".")}
 *     </p>
 *   );
 * }
 * ```
 */
export function resolveProps<P extends object>(raw: {
  [K in keyof P]: MaybeReactive<P[K]>;
}): { readonly [K in keyof P]: Computed<P[K]> } {
  const cache = new Map<PropertyKey, () => unknown>();
  return new Proxy(raw, {
    get(target, key) {
      let getter = cache.get(key);
      if (!getter) {
        const v = (target as Record<PropertyKey, unknown>)[key];
        getter = isReactive(v as MaybeReactive<unknown>)
          ? (v as () => unknown)
          : () => v;
        cache.set(key, getter);
      }
      return getter;
    },
  }) as unknown as { readonly [K in keyof P]: Computed<P[K]> };
}
