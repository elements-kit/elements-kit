import { type Computed, effect, onCleanup, signal } from "../index.ts";

type ResourceResult<T> = {
  data: Computed<T | undefined>;
  loading: Computed<boolean>;
  error: Computed<unknown>;
  refetch(): void;
};

/**
 * Runs an async `fetcher` and exposes `data`, `loading`, and `error` as
 * reactive computeds.  An `AbortController` is created for each fetch; the
 * previous request is cancelled whenever `refetch()` is called or the source
 * reactive dependencies change.
 *
 * @param source - Reactive getter whose dependencies trigger a refetch.
 * @param fetcher - Receives the resolved source value and an `AbortSignal`.
 */
export function createResource<S, T>(
  source: () => S,
  fetcher: (source: S, signal: AbortSignal) => Promise<T>,
  options?: { initialValue?: T },
): ResourceResult<T> {
  const data = signal<T | undefined>(options?.initialValue);
  const loading = signal(false);
  const error = signal<unknown>(undefined);

  // A trigger signal incremented by refetch() to force re-run.
  const tick = signal(0);

  effect(() => {
    // Read trigger so refetch() re-runs this effect.
    tick();
    const src = source();

    const controller = new AbortController();
    loading(true);
    error(undefined);

    fetcher(src, controller.signal).then(
      (result) => {
        data(result);
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
  });

  const refetch = () => tick(tick() + 1);

  return {
    data: data as Computed<T | undefined>,
    loading: loading as Computed<boolean>,
    error: error as Computed<unknown>,
    refetch,
  };
}
