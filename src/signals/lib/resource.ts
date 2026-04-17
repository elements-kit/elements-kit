import { type Computed, effect, onCleanup, signal } from "../index.ts";

type ResourceOptions<T> = {
  initialValue?: T;
  /** Max number of retries on failure (default: 0 — no retry). */
  maxRetries?: number;
  /** Base delay in ms between retries, doubles each attempt (default: 1000). */
  retryDelay?: number;
};

type ResourceResult<T> = {
  data: Computed<T | undefined>;
  loading: Computed<boolean>;
  error: Computed<unknown>;
  /** Current retry attempt (0 = first try). */
  attempt: Computed<number>;
  refetch(): void;
};

/**
 * Runs an async `fetcher` and exposes `data`, `loading`, and `error` as
 * reactive computeds.  An `AbortController` is created for each fetch; the
 * previous request is cancelled whenever `refetch()` is called or the source
 * reactive dependencies change.
 *
 * Set `maxRetries` / `retryDelay` to enable automatic retry with exponential
 * back-off on failure.
 *
 * @param source - Reactive getter whose dependencies trigger a refetch.
 * @param fetcher - Receives the resolved source value and an `AbortSignal`.
 */
export function createResource<S, T>(
  source: () => S,
  fetcher: (source: S, signal: AbortSignal) => Promise<T>,
  options?: ResourceOptions<T>,
): ResourceResult<T> {
  const maxRetries = options?.maxRetries ?? 0;
  const retryDelay = options?.retryDelay ?? 1_000;

  const data = signal<T | undefined>(options?.initialValue);
  const loading = signal(false);
  const error = signal<unknown>(undefined);
  const attempt = signal(0);

  // A trigger signal incremented by refetch() to force re-run.
  const tick = signal(0);

  effect(() => {
    // Read trigger so refetch() re-runs this effect.
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
              retryDelay * 2 ** (currentAttempt - 1),
            );
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

  const refetch = () => tick(tick() + 1);

  return {
    data: data as Computed<T | undefined>,
    loading: loading as Computed<boolean>,
    error: error as Computed<unknown>,
    attempt: attempt as Computed<number>,
    refetch,
  };
}
