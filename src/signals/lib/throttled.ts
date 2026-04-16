import { type Computed, effect, onCleanup, signal } from "../index.ts";

/**
 * Returns a `Computed` that mirrors `getter` but updates at most once per
 * `interval` milliseconds.  A trailing-edge update is scheduled so the final
 * value is never lost.
 *
 * The initial value is read synchronously.
 */
export function createThrottled<T>(
  getter: () => T,
  interval: number,
): Computed<T> {
  const s = signal<T>(getter());
  // -Infinity ensures the very first change always fires on the leading edge.
  let lastRun = -Infinity;
  let trailingTimer: ReturnType<typeof setTimeout> | undefined;
  // Skip the initial synchronous effect run — value is already initialised above.
  let firstRun = true;

  effect(() => {
    const latest = getter();

    if (firstRun) {
      firstRun = false;
      return;
    }

    const now = Date.now();
    const elapsed = now - lastRun;

    if (trailingTimer !== undefined) {
      clearTimeout(trailingTimer);
      trailingTimer = undefined;
    }

    if (elapsed >= interval) {
      lastRun = now;
      s(latest);
    } else {
      trailingTimer = setTimeout(() => {
        lastRun = Date.now();
        trailingTimer = undefined;
        s(latest);
      }, interval - elapsed);

      onCleanup(() => {
        clearTimeout(trailingTimer);
        trailingTimer = undefined;
      });
    }
  });

  return s;
}
