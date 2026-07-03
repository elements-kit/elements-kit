import { effect, MaybeReactive, resolve, SEED, signal, untracked } from "@/signals";
import { ComputedPromise, promise } from "./promise";

/** Shape of the async function driven by {@link Async} / {@link async}. */
export type Fn<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

/**
 * Reactive wrapper around an async function. Exposes the current run as
 * reactive signals (`state`, `value`, `reason`, `result`, `pending`) and
 * lets you `run`/`start`/`stop` the underlying task imperatively.
 *
 * Trigger choice: `start()` tracks the body and re-runs when its parameter
 * signals change — right for "fetch X whenever `id` changes". `run()` is
 * one-shot and untracked — right for externally-driven loads (intersection,
 * click, form submit), especially when the body writes to the same signals
 * it reads (`start()` would cascade).
 *
 * Prefer the {@link async} factory — it returns an `Async` that is also
 * callable as a signal (`op()` === `op.result`), which is what most call
 * sites want. Use this class directly only when you need the object form.
 *
 * @example
 * ```ts
 * import { Async } from "elements-kit/utilities/async";
 *
 * const loader = new Async<string, User>(fetchUser);
 * loader.run("alice");
 * effect(() => {
 *   if (loader.state === "fulfilled") console.log(loader.value);
 * });
 * ```
 */
export class Async<TInput = undefined, TOutput = unknown> {
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

  /**
   * @internal Hydration seeding — delegates to the current operation's
   * `ReactivePromise`. See `ReactivePromise[SEED]`.
   */
  [SEED](value: unknown): void {
    const seed = (
      this.raw as unknown as Record<
        PropertyKey,
        ((v: unknown) => void) | undefined
      >
    )[SEED];
    seed?.(value);
  }

  constructor(fn: MaybeReactive<Fn<TInput, TOutput>>) {
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

  [Symbol.dispose](): void {
    this.stop();
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
  SEED,
  Symbol.dispose,
]);

/**
 * Create an {@link Async} that is also callable as a signal: invoking it
 * (with no args) reads the current `result`, so it drops into any reactive
 * context that expects a zero-arg getter.
 *
 * @example
 * ```ts
 * import { async } from "elements-kit/utilities/async";
 *
 * const load = async((id: string) => fetch(`/u/${id}`).then(r => r.json()));
 * load.run("alice");
 *
 * // Read as a signal — subscribes to result changes
 * effect(() => console.log(load()));
 * await load; // Await the current run — works like a normal promise
 * ```
 */
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
