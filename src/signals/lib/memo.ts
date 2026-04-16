import { type Computed, computed, signal, trigger } from "../index.ts";

/**
 * Memoises an expensive function.  Returns a `call` function and a reactive
 * `result` signal.
 *
 * When `call` is invoked with the same serialised arguments the cached result
 * is returned.  When called with new arguments the `fn` is re-evaluated.
 *
 * @param fn   - The function to memoise.
 * @param keyFn - Optional serialiser for arguments (defaults to `JSON.stringify`).
 */
export function createMemo<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  keyFn: (...args: Args) => string = (...args) => JSON.stringify(args),
): {
  /** Call the memoised function. */
  call: (...args: Args) => R;
  /** Reactive result of the last call. */
  result: Computed<R | undefined>;
  /** Clear the memo cache. */
  clear(): void;
} {
  const cache = new Map<string, R>();
  const result = signal<R | undefined>(undefined);

  const call = (...args: Args): R => {
    const key = keyFn(...args);
    if (cache.has(key)) {
      const cached = cache.get(key) as R;
      result(cached);
      return cached;
    }
    const value = fn(...args);
    cache.set(key, value);
    result(value);
    return value;
  };

  const clear = () => cache.clear();

  return {
    call,
    result: result as Computed<R | undefined>,
    clear,
  };
}
