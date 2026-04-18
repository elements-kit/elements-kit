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
  SIGNAL as $signal,
  COMPUTED as $computed,
  EFFECT as $effect,
  EFFECT_SCOPE as $effectScope,
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

export type MaybeReactive<T> = T | Computed<T>;
/**
 * Resolves a MaybeReactive<T> to its current value.
 * If the input is a function, calls it; otherwise returns as-is.
 */
export function resolve<T>(value: MaybeReactive<T>): T {
  return isReactive(value) ? value() : value;
}
