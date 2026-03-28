import { signal, type Signal } from "./signals";

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
 *
 *   @reactive()
 *   items: string[] = [];
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
export function reactive<This extends object, Value>() {
  const signalStore = new WeakMap<This, Signal<Value>>();

  return (
    target: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ) => {
    const fieldName = context.name;

    context.addInitializer(function (this: This) {
      const descriptor = {
        get(this: This): Value {
          const sig = signalStore.get(this);
          if (!sig) {
            throw new Error(
              `Signal for field "${String(fieldName)}" was not initialized`,
            );
          }
          return sig();
        },
        set(this: This, value: Value) {
          const sig = signalStore.get(this);
          if (!sig) {
            throw new Error(
              `Signal for field "${String(fieldName)}" was not initialized`,
            );
          }
          sig(value);
        },
        enumerable: true,
        configurable: true,
      };

      Object.defineProperty(this, fieldName, descriptor);
    });

    return function (this: This, initialValue: Value): Value {
      const sig = signal(initialValue);
      signalStore.set(this, sig);
      return initialValue;
    };
  };
}
