import { Computed, computed, signal } from "@/signals";
// Symbol for branding ComputedPromise
export const isComputedPromise = Symbol("isComputedPromise");

// Class for instanceof support
export class ComputedPromiseBrand {
  static [Symbol.hasInstance](instance: any) {
    return !!instance && instance[isComputedPromise] === true;
  }
}

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

  static [Symbol.hasInstance](instance: any) {
    return (
      !!instance &&
      typeof instance === "object" &&
      instance[isComputedPromise] === true
    );
  }

  static from<T, E = unknown>(promise: Promise<T>): ReactivePromise<T, E> {
    return new ReactivePromise((resolve, reject) => {
      promise.then(resolve).catch(reject);
    });
  }
}

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
  } else if (from instanceof Promise) {
    return ReactivePromise.from(from);
  } else {
    return new ReactivePromise(from);
  }
}

export function createPromise<T, E = unknown>(
  promise: ReactivePromise<T>,
): ComputedPromise<T, E>;

export function createPromise<T, E = unknown>(
  promise: Promise<T>,
): ComputedPromise<T, E>;

export function createPromise<T, E = unknown>(
  executor: Executor<T, E>,
): ComputedPromise<T, E>;

export function createPromise<T, E = unknown>(
  from: Executor<T, E> | Promise<T> | ReactivePromise<T, E>,
): ComputedPromise<T, E> {
  const promise = resolvePromise(from);

  const $value = computed(() => {
    if (promise.state === "pending") {
      return;
    } else if (promise.state === "fulfilled") {
      return promise.value;
    } else {
      throw promise.reason;
    }
  });

  // Make $value callable and awaitable by forwarding .then/.catch/finally
  // Attach branding symbol
  ($value as any)[isComputedPromise] = true;
  // Forward promise methods
  ($value as any).then = promise.then.bind(promise);
  ($value as any).catch = promise.catch.bind(promise);
  ($value as any).finally = promise.finally.bind(promise);
  // Forward state, value, reason as properties
  Object.defineProperties($value, {
    state: { get: () => promise.state },
    value: { get: () => promise.value },
    reason: { get: () => promise.reason },
  });
  return $value as ComputedPromise<T, E>;
}
