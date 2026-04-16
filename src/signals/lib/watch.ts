import { effect, untracked } from "../index.ts";

/**
 * Watches a reactive `source` getter and runs `callback` whenever the source
 * changes, skipping the initial run.
 *
 * ```ts
 * const count = signal(0);
 * createWatch(() => count(), (value, prev) => console.log(value, prev));
 * count(1); // logs: 1, 0
 * ```
 *
 * @returns A disposal function.
 */
export function createWatch<T>(
  source: () => T,
  callback: (value: T, prev: T | undefined) => void,
): () => void {
  let prev: T | undefined;
  let firstRun = true;

  return effect(() => {
    const value = source();
    if (firstRun) {
      firstRun = false;
      prev = value;
      return;
    }
    const p = prev;
    prev = value;
    untracked(() => callback(value, p));
  });
}
