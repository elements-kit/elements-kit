import { type Computed, effect, onCleanup, signal } from "../index.ts";

type AsyncStateResult<T> = {
  data: Computed<T | undefined>;
  loading: Computed<boolean>;
  error: Computed<unknown>;
  /** Execute the async function / re-execute on demand. */
  execute(): void;
};

/**
 * Wraps an async function **or** an async iterable (stream) and exposes
 * reactive `data`, `loading`, and `error` signals.
 *
 * - **Promise** — resolves once, `data` is set to the resolved value.
 * - **AsyncIterable** — each yielded value updates `data`; `loading`
 *   stays `true` until the iterator is done or errors.
 *
 * An `AbortSignal` is passed to the producer so in-flight work can be
 * cancelled when the scope is disposed or `execute()` is called again.
 *
 * @param producer - Returns a `Promise<T>` or `AsyncIterable<T>`.
 * @param options.immediate - Run on creation (default `true`).
 * @param options.initialValue - Seed value for `data`.
 */
export function createAsyncState<T>(
  producer: (signal: AbortSignal) => Promise<T> | AsyncIterable<T>,
  options?: { immediate?: boolean; initialValue?: T },
): AsyncStateResult<T> {
  const { immediate = true } = options ?? {};

  const data = signal<T | undefined>(options?.initialValue);
  const loading = signal(false);
  const error = signal<unknown>(undefined);
  const tick = signal(0);

  effect(() => {
    const current = tick();
    if (current === 0) return;

    const controller = new AbortController();
    loading(true);
    error(undefined);

    const result = producer(controller.signal);

    if (Symbol.asyncIterator in Object(result)) {
      // Async iterable (stream) path
      const iter = (result as AsyncIterable<T>)[Symbol.asyncIterator]();

      let cancelled = false;
      const pull = () => {
        iter.next().then(
          ({ value, done }) => {
            if (cancelled) return;
            if (done) {
              loading(false);
              return;
            }
            data(value);
            pull();
          },
          (err: unknown) => {
            if (cancelled) return;
            error(err);
            loading(false);
          },
        );
      };
      pull();

      onCleanup(() => {
        cancelled = true;
        controller.abort();
        iter.return?.();
      });
    } else {
      // Promise path
      (result as Promise<T>).then(
        (value) => {
          data(value);
          loading(false);
        },
        (err: unknown) => {
          if ((err as { name?: string }).name !== "AbortError") {
            error(err);
            loading(false);
          }
        },
      );

      onCleanup(() => controller.abort());
    }
  });

  const execute = () => tick(tick() + 1);

  // Kick off the first run if immediate.
  if (immediate) execute();

  return {
    data: data as Computed<T | undefined>,
    loading: loading as Computed<boolean>,
    error: error as Computed<unknown>,
    execute,
  };
}
