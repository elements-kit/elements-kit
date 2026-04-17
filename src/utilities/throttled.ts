import { type Computed, effect, signal } from "../signals/index.ts";
import { createTimeout } from "@/utilities/timeout.ts";

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
  let lastRun = -Infinity;
  let firstRun = true;
  let latest: T;

  const { stop, reset } = createTimeout(
    () => {
      lastRun = Date.now();
      s(latest);
    },
    () => interval - (Date.now() - lastRun),
    false,
  );

  effect(() => {
    latest = getter();

    if (firstRun) {
      firstRun = false;
      return;
    }

    const elapsed = Date.now() - lastRun;

    stop();

    if (elapsed >= interval) {
      lastRun = Date.now();
      s(latest);
    } else {
      reset();
    }
  });

  return s;
}
