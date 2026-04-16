import { type Computed, effect, onCleanup, signal } from "../index.ts";

type AsyncRetryResult<T> = {
  data: Computed<T | undefined>;
  loading: Computed<boolean>;
  error: Computed<unknown>;
  retry(): void;
  attempt: Computed<number>;
};

/**
 * Like `createResource` but automatically retries on failure up to
 * `maxRetries` times with an exponential-back-off delay.
 */
export function createAsyncRetry<S, T>(
  source: () => S,
  fetcher: (source: S, signal: AbortSignal) => Promise<T>,
  options?: { initialValue?: T; maxRetries?: number; delay?: number },
): AsyncRetryResult<T> {
  const { maxRetries = 3, delay = 1_000 } = options ?? {};

  const data = signal<T | undefined>(options?.initialValue);
  const loading = signal(false);
  const error = signal<unknown>(undefined);
  const attempt = signal(0);
  const tick = signal(0);

  effect(() => {
    tick();
    const src = source();
    const controller = new AbortController();
    loading(true);
    error(undefined);
    attempt(0);

    let currentAttempt = 0;

    const run = () => {
      fetcher(src, controller.signal).then(
        (result) => {
          data(result);
          loading(false);
        },
        (err: unknown) => {
          if ((err as { name?: string }).name === "AbortError") return;
          if (currentAttempt < maxRetries) {
            currentAttempt++;
            attempt(currentAttempt);
            const retryTimer = setTimeout(
              run,
              delay * 2 ** (currentAttempt - 1),
            );
            // Store timer ref for cleanup — closure captures it.
            // If the effect is cleaned up before the timer fires, abort.
            const orig = cleanup;
            cleanup = () => {
              clearTimeout(retryTimer);
              orig();
            };
          } else {
            error(err);
            loading(false);
          }
        },
      );
    };

    let cleanup = () => controller.abort();
    run();

    onCleanup(() => cleanup());
  });

  const retry = () => tick(tick() + 1);

  return {
    data: data as Computed<T | undefined>,
    loading: loading as Computed<boolean>,
    error: error as Computed<unknown>,
    attempt: attempt as Computed<number>,
    retry,
  };
}
