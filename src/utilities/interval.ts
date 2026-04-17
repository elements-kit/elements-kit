import { type Computed, onCleanup, signal } from "@/signals/index.ts";

type IntervalResult = {
  isRunning: Computed<boolean>;
  start(): void;
  stop(): void;
  reset(): void;
} & Disposable;

/**
 * Pausable `setInterval` wrapper.  Starts running immediately on creation.
 *
 * @param callback - Called on each tick.
 * @param delay    - Interval delay in ms (or a reactive getter).
 */
export function createInterval(
  callback: () => void,
  delay: number | (() => number),
): IntervalResult {
  const isRunning = signal(true);
  let id: ReturnType<typeof setInterval> | undefined;

  const getDelay = typeof delay === "function" ? delay : () => delay;

  const start = () => {
    if (id !== undefined) return;
    isRunning(true);
    id = setInterval(() => callback(), getDelay());
  };

  const stop = () => {
    clearInterval(id);
    id = undefined;
    isRunning(false);
  };

  const reset = () => {
    stop();
    start();
  };

  start();

  const cleanup = () => stop();
  onCleanup(cleanup);

  return {
    isRunning: isRunning as Computed<boolean>,
    start,
    stop,
    reset,
    [Symbol.dispose]: cleanup,
  };
}
