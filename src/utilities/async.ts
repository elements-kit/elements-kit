import { effect, MaybeReactive, resolve, signal, untracked } from "@/signals";
import { ComputedPromise, promise } from "./promise";

export type Fn<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

export class Async<TInput = undefined, TOutput = unknown> extends Promise<
  TOutput | undefined
> {
  #fn = signal<Fn<TInput, TOutput>>(async () =>
    Promise.resolve(undefined as unknown as TOutput),
  );
  #cleanup = () => {};

  get fn(): Fn<TInput, TOutput> {
    return this.#fn();
  }
  set fn(fn: MaybeReactive<Fn<TInput, TOutput>>) {
    this.#fn(resolve(fn));
  }

  #current = signal<ComputedPromise<TOutput | undefined>>(promise(() => {}));
  get raw() {
    return this.#current();
  }
  get pending() {
    return this.raw.state === "pending";
  }
  get state() {
    return this.raw.state;
  }
  get value() {
    return this.raw.value;
  }
  get reason() {
    return this.raw.reason;
  }
  get result() {
    return this.raw.result;
  }

  then<TResult1 = TOutput, TResult2 = never>(
    onfulfilled?:
      | ((value: TOutput | undefined) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.raw.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<TOutput | undefined | TResult> {
    return this.raw.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<TOutput | undefined> {
    return this.raw.finally(onfinally);
  }

  constructor(fn: MaybeReactive<Fn<TInput, TOutput>>) {
    super((res, rej) => {
      this.#current(promise(() => {})); // initialize with pending promise
      this.#fn(resolve(fn));
      this.then(res, rej);
    });
    this.#fn(resolve(fn));
  }

  #execute(
    ...args: TInput extends undefined ? [] : [input: TInput]
  ): Promise<TOutput> {
    const input = args[0] as TInput;
    const p = promise(this.fn(input));
    this.#current(p);
    return p;
  }

  /**
   * Runs the async function once with the given input, stopping any currently active
   * and register cleanup effects.
   */
  run(...args: TInput extends undefined ? [] : [input: TInput]): this {
    this.stop();
    this.#cleanup = effect(() => {
      // untrack parameters and fn resolution to avoid intermediate states
      untracked(() => this.#execute(...args));
    });
    return this;
  }

  /**
   * Stops the current async operation and run cleanup effects.
   */
  stop(): this {
    this.#cleanup();
    this.#cleanup = () => {};
    return this;
  }

  /**
   * Starts a new reactive async operation, stopping any currently active one.
   */
  start(...args: TInput extends undefined ? [] : [input: TInput]): this {
    this.stop();

    this.#cleanup = effect(() => {
      this.#execute(...args);
    });
    return this;
  }
}

const ASYNC_KEYS = new Set<PropertyKey>([
  "then",
  "catch",
  "finally",
  "state",
  "value",
  "reason",
  "result",
  "pending",
  "start",
  "stop",
  "run",
  "fn",
  "raw",
]);

export function async<TInput = any, TOutput = undefined>(
  fn: MaybeReactive<(input: TInput) => Promise<TOutput>>,
): Async<TInput, TOutput> & ((...args: any[]) => TOutput | undefined) {
  const inst = new Async(fn);
  const signal = () => inst.result;
  return new Proxy(signal, {
    apply(_target, _thisArg, args) {
      // Allow calling op() as a signal
      return inst.result;
    },
    get(_target, prop, receiver) {
      if (ASYNC_KEYS.has(prop)) {
        const val = inst[prop as keyof Async<TInput, TOutput>];
        return typeof val === "function" ? val.bind(inst) : val;
      }
      // Allow reading .length, .name, etc from the signal function
      return Reflect.get(signal, prop, receiver);
    },
    getPrototypeOf() {
      return Async.prototype;
    },
  }) as Async<TInput, TOutput> & ((...args: any[]) => TOutput | undefined);
}
