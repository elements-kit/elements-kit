import { type Computed, effect, signal } from "../index.ts";

/**
 * Like `createPrevious` but only updates when the value is *distinct*
 * (i.e. fails the equality check).
 */
export function createPreviousDistinct<T>(
  getter: () => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): Computed<T | undefined> {
  const prev = signal<T | undefined>(undefined);
  let current: T | undefined;
  let initialized = false;

  effect(() => {
    const next = getter();
    if (!initialized || !isEqual(next, current as T)) {
      prev(current);
      current = next;
      initialized = true;
    }
  });

  return prev;
}
