import { type Computed, effect, signal } from "@/signals/index.ts";
import { createTimeout } from "@/utilities/timeout.ts";

/**
 * Returns a `Computed` that mirrors `getter` but only updates after `delay`
 * milliseconds of silence (i.e. no new values from `getter`).
 *
 * The initial value is read synchronously, so the computed is never undefined.
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
