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
} from "alien-signals";
import {
  isSignal,
  isComputed,
  signal,
  setActiveSub,
  startBatch,
  endBatch,
} from "alien-signals";
import type { ValueOrReactive } from "./builder/core";

export function isReactive<T>(value: ValueOrReactive<T>): value is () => T {
  return isSignal(value as () => T) || isComputed(value as () => T);
}

export type Signal<T> = ReturnType<typeof signal<T>>;

export const batch = (fn: () => void): void => {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
};

export const untracked = <T>(fn: () => T): T => {
  const sub = setActiveSub(void 0);
  try {
    return fn();
  } finally {
    setActiveSub(sub);
  }
};

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
