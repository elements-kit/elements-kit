import { type Computed, effect, signal } from "../index.ts";

/**
 * Returns a `Computed` that always holds the *previous* value emitted by
 * `getter`.  Starts as `undefined` until the getter changes for the first time.
 */
export function createPrevious<T>(getter: () => T): Computed<T | undefined> {
  const prev = signal<T | undefined>(undefined);
  let current: T | undefined;

  effect(() => {
    const next = getter();
    prev(current);
    current = next;
  });

  return prev;
}
