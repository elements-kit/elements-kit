import { type Computed, effect, signal } from "../index.ts";

/**
 * Returns a `Computed` that always holds the *previous* value emitted by
 * `getter`.  Starts as `undefined` until the getter changes for the first time.
 *
 * When `ignore` is provided, the previous value only updates when the ignore check fails.
 */
export function createPrevious<T>(
  getter: () => T,
  ignore?: (a: T, b: T) => boolean,
): Computed<T | undefined> {
  const prev = signal<T | undefined>(undefined);
  let current: T | undefined;
  let initialized = false;

  effect(() => {
    const next = getter();
    if (!initialized || !ignore || !ignore(next, current as T)) {
      prev(current);
      current = next;
      initialized = true;
    }
  });

  return prev;
}

/** @deprecated Use `createPrevious(getter, isEqual)` instead. */
export const createPreviousDistinct = createPrevious;
