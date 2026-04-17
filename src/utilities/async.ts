import {
  effect,
  MaybeReactive,
  reactive,
  resolve,
  signal,
  batch,
} from "@/signals";

export type Fn<TInput, TOutput> = (
  this: Async<TInput, TOutput>,
  input: TInput,
) => Promise<TOutput>;

export class Async<TInput = undefined, TOutput = unknown> {
  #promise: Promise<TOutput> | undefined;
  get promise() {
    return this.#promise;
  }
  #pending = signal(false);
  get pending() {
    return this.#pending();
  }

  @reactive() data: TOutput | undefined = undefined;
  @reactive() error: unknown;

  #fn = signal<Fn<TInput, TOutput>>(async () =>
    Promise.resolve(undefined as unknown as TOutput),
  );
  get fn(): Fn<TInput, TOutput> {
    return this.#fn();
  }
  set fn(fn: MaybeReactive<Fn<TInput, TOutput>>) {
    this.#fn(resolve(fn));
  }

  constructor(fn: MaybeReactive<Fn<TInput, TOutput>>) {
    this.#fn(resolve(fn));
  }

  reset() {
    this.stop();
    this.data = undefined;
    this.error = undefined;
    return this;
  }

  #stop = () => {};
  stop() {
    this.#pending(false);
    this.#stop();
    return this;
  }

  run(...args: TInput extends undefined ? [] : [input: TInput]): this {
    const input = args[0] as TInput;
    this.stop();
    this.#stop = effect(() => {
      this.#pending(true);
      this.#promise = this.fn
        .call(this, input)
        .then((output) => {
          batch(() => {
            this.data = output;
            this.#pending(false);
            console.log(
              "Async operation completed with result:",
              output,
              this.pending,
            );
          });
          return output;
        })
        .catch((err) => {
          batch(() => {
            this.error = err;
            this.#pending(false);
            console.error(
              "Async operation failed with error:",
              err,
              this.pending,
            );
          });
          throw err;
        });
    });
    return this;
  }
}

export function async<TInput = any, TOutput = undefined>(
  fn: MaybeReactive<
    (this: Async<TInput, TOutput>, input: TInput) => Promise<TOutput>
  >,
): Async<TInput, TOutput> {
  return new Async(fn);
}
