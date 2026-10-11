import { batch, CLAIM, Computed, computed, SEED, signal, untracked } from "@/signals";

/**
 * A `Promise` subclass that exposes its state as reactive signals.
 *
 * Prefer the {@link promise} factory for most use cases — it returns a
 * `ComputedPromise` that is both awaitable and callable as a signal.
 * Use `ReactivePromise` directly when you need the lower-level class —
 * for example, to wrap a promise and expose `.state`, `.value`, `.reason`,
 * and `.result` without the `Computed` callable interface.
 *
 * @example
 * ```ts
 * const rp = ReactivePromise.from(fetch("/api/data"));
 *
 * effect(() => {
 *   if (rp.state === "fulfilled") console.log(rp.value);
 * });
 * ```
 */
export class ReactivePromise<T, E = unknown> extends Promise<T> {
  #state = signal<"pending" | "fulfilled" | "rejected">("pending");
  #value = signal<T | undefined>(undefined);
  #reason = signal<E | undefined>(undefined);
  #result = computed<T | E | undefined>(() => {
    const state = this.#state();
    if (state === "fulfilled") return this.#value() as T;
    if (state === "rejected") return this.#reason() as E;
    return undefined;
  });

  get state() {
    return this.#state();
  }

  get value() {
    return this.#value();
  }

  get reason() {
    return this.#reason();
  }

  get result(): T | E | undefined {
    return this.#result();
  }

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void,
    ) => void,
  ) {
    super((res, rej) => {
      executor(
        async (value) => {
          const resolved = await value;
          batch(() => {
            this.#state("fulfilled");
            this.#value(resolved);
          });
          res(value);
        },
        async (_reason) => {
          // async defers past super() so `this` is available, mirroring the
          // resolve handler's `await value` which had the same effect
          const reason = await _reason;
          batch(() => {
            this.#state("rejected");
            this.#reason(reason);
          });
          rej(reason);
        },
      );
    });
  }

  static from<T, E = unknown>(p: Promise<T>): ReactivePromise<T, E> {
    return new ReactivePromise((resolve, reject) => {
      p.then(resolve).catch(reject);
    });
  }

  /**
   * @internal Hydration seeding: settle the reactive state from a serialized
   * server snapshot. The underlying promise is untouched — when it actually
   * resolves or rejects, its handlers overwrite the seeded state
   * (stale-while-revalidate). `await` still waits for the real settlement.
   */
  [SEED](value: unknown): void {
    batch(() => {
      this.#state("fulfilled");
      this.#value(value as T);
    });
  }

  /**
   * @internal Hydrate claim protocol: seed from the server record while the
   * underlying promise is still pending. The promise fired at construction —
   * there is no run to skip here (see `Async[CLAIM]` for that).
   */
  [CLAIM](record: { value: unknown } | undefined): void {
    if (record && untracked(() => this.#state()) === "pending") {
      this[SEED](record.value);
    }
  }
}

// Registry brand: instanceof fails across duplicate runtime copies, so
// detection goes through this prototype-stamped symbol.
const REACTIVE_PROMISE_BRAND = Symbol.for("elements-kit.reactive-promise");
Object.defineProperty(ReactivePromise.prototype, REACTIVE_PROMISE_BRAND, {
  value: true,
});

/** @internal Cross-instance-safe `ReactivePromise` detection. */
export function isReactivePromiseLike(
  value: unknown,
): value is ReactivePromise<unknown, unknown> {
  if (value instanceof ReactivePromise) return true;
  return (
    value != null &&
    (typeof value === "object" || typeof value === "function") &&
    (value as Record<symbol, unknown>)[REACTIVE_PROMISE_BRAND] === true
  );
}

const PROMISE_KEYS = new Set<PropertyKey>([
  "then",
  "catch",
  "finally",
  "state",
  "value",
  "reason",
  "result",
  SEED,
  CLAIM,
  REACTIVE_PROMISE_BRAND,
]);

/**
 * A {@link ReactivePromise} that is also callable as a `Computed<T | E | undefined>`.
 *
 * Invoking it (`p()`) reads the current `.result` — so it drops into any
 * reactive context that expects a zero-arg getter.
 */
export type ComputedPromise<T, E = unknown> = ReactivePromise<T, E> &
  Computed<T | E | undefined>;

type Executor<T, E = unknown> = (
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (reason?: E) => void,
) => void;

function resolvePromise<T, E = unknown>(
  from: Executor<T, E> | Promise<T> | ReactivePromise<T, E>,
): ReactivePromise<T, E> {
  if (from instanceof ReactivePromise) {
    return from;
  }
  if (from instanceof Promise) {
    return ReactivePromise.from(from);
  }
  return new ReactivePromise(from);
}

/**
 * Wraps a promise, executor, or `ReactivePromise` into a `ComputedPromise` —
 * an object that is both awaitable like a regular Promise and reactive like a
 * `Computed` signal.
 *
 * **Awaitable:** `await promise(fetch(...))` resolves to the fulfilled value,
 * or rejects with the rejection reason, just like a native Promise.
 *
 * **Reactive:** calling the returned value as a function (`cp()`) reads the
 * current result inside an `effect` or `computed`, tracking it as a dependency.
 * Equivalent to `.result` — returns `undefined` while pending, the fulfilled
 * value when resolved, or the rejection reason when rejected.
 *
 * Reactive state is also accessible via:
 * - `.state` — `"pending" | "fulfilled" | "rejected"`
 * - `.value` — the resolved value (or `undefined` while pending)
 * - `.reason` — the rejection reason (or `undefined` while pending/fulfilled)
 * - `.result` — `T | E | undefined`; the resolved value, rejection reason, or `undefined` while pending
 */
export function promise<T, E = unknown>(
  p: ReactivePromise<T>,
): ComputedPromise<T, E>;

export function promise<T, E = unknown>(p: Promise<T>): ComputedPromise<T, E>;

export function promise<T, E = unknown>(
  executor: Executor<T, E>,
): ComputedPromise<T, E>;

export function promise<T, E = unknown>(
  from: Executor<T, E> | Promise<T> | ReactivePromise<T, E>,
): ComputedPromise<T, E> {
  const p = resolvePromise(from);
  const $value = computed(() => p.result);

  return new Proxy($value, {
    apply() {
      return $value();
    },
    get(target, prop, receiver) {
      if (PROMISE_KEYS.has(prop)) {
        const val = p[prop as keyof ReactivePromise<T, E>];
        return typeof val === "function" ? (val as Function).bind(p) : val;
      }
      return Reflect.get(target, prop, receiver);
    },
    getPrototypeOf() {
      return ReactivePromise.prototype;
    },
  }) as ComputedPromise<T, E>;
}
