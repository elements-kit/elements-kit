import { type Computed, effect, signal } from "../index.ts";

/**
 * Returns a `Computed` that always holds the *previous* value of `source`.
 * Starts as `undefined` until the source changes for the first time.
 *
 * When `ignore` is provided, the previous value only updates when the ignore check fails.
 */
export function createPrevious<T>(
  source: Computed<T>,
  ignore?: (a: T, b: T) => boolean,
): Computed<T | undefined> {
  const prev = signal<T | undefined>(undefined);
  let current: T | undefined;
  let initialized = false;

  effect(() => {
    const next = source();
    if (!initialized || !ignore || !ignore(next, current as T)) {
      prev(current);
      current = next;
      initialized = true;
    }
  });

  return prev;
}
