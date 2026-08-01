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
  SEED,
  CLAIM,
} from "./lib";
import { isSignal, isComputed, signal } from "./lib";
import "../polyfill";

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
 * Resolve a {@link MaybeReactive} to its current value. Calls the getter when
 * reactive (a `signal` or `computed`); returns the value as-is otherwise — an
 * unbranded function is a value, not a source, so a callback survives intact.
 *
 * This is how a function component reads a prop it declared `MaybeReactive`:
 * the runtime hands props over exactly as the caller wrote them, so the value
 * may be either form. Reading inside an effect or a JSX getter subscribes.
 *
 * @example
 * ```ts
 * resolve(5);            // 5
 * resolve(count);        // current count value — signal
 * resolve(props.label);  // current value, whichever form the caller passed
 * resolve(() => 5);      // the function itself — unbranded, so not a source
 * ```
 */
export function resolve<T>(value: MaybeReactive<T>): T {
  return isReactive(value) ? value() : value;
}

/**
 * A props bag where every key is a getter — what {@link computedProps} produces.
 * The counterpart to `Props<P>`: that one is what a caller may pass, this is
 * what a body reads. Optional keys lose their `?`, so `props.excited()` needs
 * no `?.` — the getter is always there, only its result may be undefined.
 *
 * @template P — the raw prop shape.
 */
export type ComputedProps<P> = { readonly [K in keyof P]-?: Computed<P[K]> };

/**
 * Reactive keys become the value they yield. `computedProps` infers its shape
 * verbatim and unwraps here, because inferring through `T | Computed<T>` picks
 * the `Computed` branch for any function prop and yields its return type.
 */
type Unwrap<P> = { [K in keyof P]: UnwrapValue<P[K]> };

/** Naked parameter so it distributes: `T | Computed<T>` collapses to `T`. */
type UnwrapValue<V> = V extends Computed<infer T> ? T : V;

/** Arity of a call signature; `0` for anything that is not callable. */
type ArgCount<F> = F extends (...args: infer A) => unknown ? A["length"] : 0;

type ArgFnPropError =
  "computedProps: a prop that takes arguments cannot be inferred here — read it off the raw props instead";

/**
 * Reject props that take arguments — inference cannot tell them from a getter.
 * Zero-arg ones stay: `Signal` and `Computed` are zero-arg callables too.
 */
type NoArgFnProps<P> = {
  [K in keyof P]: ArgCount<P[K]> extends 0 ? P[K] : ArgFnPropError;
};

const COMPUTED_PROPS = Symbol.for("elements-kit.computed-props");

/**
 * Turn props into a bag of per-key getters, so a body reads one shape no matter
 * which form the caller passed. Opt-in: the JSX runtime hands function
 * components their props untouched.
 *
 * Every key is callable, including one the caller omitted. A getter is always
 * truthy, so defaults go on the call: `props.excited() ?? "…"`. Read a bag by
 * calling the key — {@link resolve} is for raw props.
 *
 * Function props are the limit: a prop taking arguments is rejected, and a
 * zero-arg one types as its return value. Read those off the raw props.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const props = computedProps({ count, label: "n" });
 * props.count();   // 0 — subscribes to count
 * props.label();   // "n"
 * ```
 */
export function computedProps<P extends object>(
  raw: P & NoArgFnProps<P>,
): ComputedProps<Unwrap<P>> {
  // Idempotent: a bag handed back in stays itself — re-wrapping would turn
  // every read into a getter returning a getter.
  if ((raw as Record<PropertyKey, unknown>)[COMPUTED_PROPS]) {
    return raw as unknown as ComputedProps<Unwrap<P>>;
  }
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
    get: (target, key, receiver) => {
      if (key === COMPUTED_PROPS) return true;
      // Only synthesize for keys that could name a prop; `toJSON` would
      // otherwise hijack JSON.stringify. Passed keys always win.
      if (
        !ownKeySet.has(key) &&
        (typeof key === "symbol" || key in target || key === "toJSON")
      )
        return Reflect.get(target, key, receiver);
      return get(key);
    },
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
  }) as unknown as ComputedProps<Unwrap<P>>;
}
