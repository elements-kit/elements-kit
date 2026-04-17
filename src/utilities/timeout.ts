import { type Computed, onCleanup, signal } from "@/signals/index.ts";

type TimeoutResult = {
  isRunning: Computed<boolean>;
  start(): void;
  stop(): void;
  reset(): void;
} & Disposable;

/**
 * Reactive `setTimeout` wrapper with pause/resume/reset control.
 * The callback fires once after `delay` ms.  Starts running immediately
 * unless `immediate` is set to `false`.
 */
export function createTimeout(
  callback: () => void,
  delay: number | (() => number),
  immediate = true,
): TimeoutResult {
  const isRunning = signal(false);
  let id: ReturnType<typeof setTimeout> | undefined;
  const getDelay = typeof delay === "function" ? delay : () => delay;

  const stop = () => {
    clearTimeout(id);
    id = undefined;
    isRunning(false);
  };

  const start = () => {
    if (isRunning()) return;
    isRunning(true);
    id = setTimeout(() => {
      isRunning(false);
      id = undefined;
      callback();
    }, getDelay());
  };

  const reset = () => {
    stop();
    start();
  };

  if (immediate) start();

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
