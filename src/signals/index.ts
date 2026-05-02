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
import type { ReactiveProps } from "@/jsx-runtime/infer";

/**
 * Type-guard: `true` when `value` is a reactive source (`signal` or `computed`),
 * `false` when it is a plain value.
 *
 * Use this when you accept {@link MaybeReactive} and need to branch on whether
 * the caller passed a live source or a static value.
 *
 * @example
 * ```ts
 * import { signal, isReactive } from "elements-kit/signals";
 *
 * const a: MaybeReactive<number> = 5;
 * const b: MaybeReactive<number> = signal(0);
 * const c: () => number = () => 5;
 *
 * isReactive(a); // false
 * isReactive(b); // true
 * isReactive(c); // false
 * ```
 */
export function isReactive<T>(value: MaybeReactive<T>): value is () => T {
  return isSignal(value as () => T) || isComputed(value as () => T);
}

/** Writer half of a {@link Signal}: `sig(next)` assigns a new value. */
export type Updater<T> = (value: T) => void;

/** Zero-arg getter that subscribes the current tracking scope on call. */
export type Computed<T> = () => T;

/**
 * A reactive read/write cell — callable as both a getter (no args) and a
 * setter (one arg).
 *
 * @example
 * ```ts
 * import { signal } from "elements-kit/signals";
 *
 * const count: Signal<number> = signal(0);
 * count();   // read → 0 (subscribes the active scope)
 * count(5);  // write → notifies subscribers
 * ```
 */
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
 *   \@reactive() count: number = 0;
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
 * The JSX runtime auto-applies this to function-component props — call
 * directly only for non-JSX call sites or nested prop bags.
 *
 * @example
 * ```ts
 * import { resolveProps } from "elements-kit/signals";
 * import { signal } from "elements-kit/signals";
 *
 * const count = signal(0);
 * const props = resolveProps({ count, label: "n" });
 * props.count();   // 0 — subscribes to count
 * props.label();   // "n"
 * ```
 */
export function resolveProps<P extends object>(raw: {
  [K in keyof P]: MaybeReactive<P[K]>;
}): ReactiveProps<P> {
  // Snapshot the key list once. Proxy traps (`ownKeys`,
  // `getOwnPropertyDescriptor`, `has`) reuse it instead of calling
  // `Reflect.ownKeys(raw)` per access.
  const ownKeys = Reflect.ownKeys(raw);
  const ownKeySet = new Set<PropertyKey>(ownKeys);
  const cache = new Map<PropertyKey, () => unknown>();
  const get = (key: PropertyKey): (() => unknown) => {
    let getter = cache.get(key);
    if (!getter) {
      const v = (raw as Record<PropertyKey, unknown>)[key];
      getter = isReactive(v as MaybeReactive<unknown>)
        ? (v as () => unknown)
        : () => v;
      cache.set(key, getter);
    }
    return getter;
  };
  return new Proxy(raw, {
    get: (_target, key) => get(key),
    has: (_target, key) => ownKeySet.has(key),
    ownKeys: () => ownKeys,
    getOwnPropertyDescriptor: (_target, key) =>
      ownKeySet.has(key)
        ? {
            enumerable: true,
            configurable: true,
            writable: false,
            value: get(key),
          }
        : undefined,
  }) as unknown as ReactiveProps<P>;
}
