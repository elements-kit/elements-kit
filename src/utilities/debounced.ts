import { type Computed, effect, signal } from "@/signals/index.ts";
import { createTimeout } from "@/utilities/timeout.ts";

/**
 * Returns a `Computed` that mirrors `getter` but only updates after `delay`
 * milliseconds of silence (i.e. no new values from `getter`).
 *
 * The initial value is read synchronously, so the computed is never undefined.
 *
 * @example
 * ```ts
 * import { signal } from "elements-kit/signals";
 * import { createDebounced } from "elements-kit/utilities/debounced";
 *
 * const query = signal("");
 * const debounced = createDebounced(query, 300);
 *
 * effect(() => fetch(`/search?q=${debounced()}`));
 * ```
 */
export function createDebounced<T>(
  getter: () => T,
  delay: number | (() => number),
): Computed<T> {
  const s = signal<T>(getter());
  let latest: T;
  const { reset } = createTimeout(() => s(latest), delay, false);

  effect(() => {
    latest = getter();
    reset();
  });

  return s;
}
