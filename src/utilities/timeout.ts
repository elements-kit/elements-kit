import { type Computed, onCleanup, signal } from "@/signals/index.ts";

type TimeoutResult = {
  pending: Computed<boolean>;
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
  const pending = signal(false);
  let id: ReturnType<typeof setTimeout> | undefined;
  const getDelay = typeof delay === "function" ? delay : () => delay;

  const stop = () => {
    clearTimeout(id);
    id = undefined;
    pending(false);
  };

  const start = () => {
    if (pending()) return;
    pending(true);
    id = setTimeout(() => {
      pending(false);
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
    pending,
    start,
    stop,
    reset,
    [Symbol.dispose]: cleanup,
  };
}
