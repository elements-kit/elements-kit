import { type Computed, effect, onCleanup, signal } from "../index.ts";

/**
 * Returns a `Computed` that mirrors `getter` but only updates after `delay`
 * milliseconds of silence (i.e. no new values from `getter`).
 *
 * The initial value is read synchronously, so the computed is never undefined.
 */
export function createDebounced<T>(
  getter: () => T,
  delay: number,
): Computed<T> {
  const s = signal<T>(getter());
  let timer: ReturnType<typeof setTimeout>;

  effect(() => {
    const latest = getter();
    timer = setTimeout(() => s(latest), delay);
    onCleanup(() => clearTimeout(timer));
  });

  return s;
}
