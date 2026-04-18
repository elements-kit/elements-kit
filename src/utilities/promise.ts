import { Computed, computed, signal } from "@/signals";

export class ReactivePromise<T, E = unknown> extends Promise<T> {
  #state = signal<"pending" | "fulfilled" | "rejected">("pending");
  #value = signal<T | undefined>(undefined);
  #reason = signal<E | undefined>(undefined);

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
    if (this.state === "fulfilled") {
      return this.value;
    }
    if (this.state === "rejected") {
      return this.reason;
    }
    return undefined;
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
          this.#state("fulfilled");
          this.#value(await value);
          res(value);
        },
        async (reason) => {
          this.#state("rejected");
          this.#reason(await reason);
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
}

const PROMISE_KEYS = new Set<PropertyKey>([
  "then",
  "catch",
  "finally",
  "state",
  "value",
  "reason",
  "result",
]);

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

export function promise<T, E = unknown>(
  p: ReactivePromise<T>,
): ComputedPromise<T, E>;

export function promise<T, E = unknown>(p: Promise<T>): ComputedPromise<T, E>;

export function promise<T, E = unknown>(
  executor: Executor<T, E>,
): ComputedPromise<T, E>;

/**
 * Creates a computed promise that tracks the state of the given promise or executor.
 * The returned object has the same API as a regular promise, but also includes reactive properties:
 * - `state`: "pending" | "fulfilled" | "rejected"
 * - `value`: the resolved value (if fulfilled)
 * - `reason`: the rejection reason (if rejected)
 * @param from The promise, reactive promise, or executor to track.
 * @returns A computed promise with reactive properties.
 */
export function promise<T, E = unknown>(
  from: Executor<T, E> | Promise<T> | ReactivePromise<T, E>,
): ComputedPromise<T, E> {
  const p = resolvePromise(from);

  const $value = computed(() => {
    if (p.state === "pending") {
      return;
    } else if (p.state === "fulfilled") {
      return p.value;
    } else {
      throw p.reason;
    }
  });

  return new Proxy($value, {
    apply(target) {
      return target();
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
