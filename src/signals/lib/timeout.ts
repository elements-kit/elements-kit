import { type Computed, onCleanup, signal } from "../index.ts";

type TimeoutResult = {
  isPending: Computed<boolean>;
  start(): void;
  stop(): void;
  reset(): void;
} & Disposable;

/**
 * Reactive `setTimeout` wrapper with pause/resume/reset control.
 * The callback fires once after `delay` ms.  Starts running immediately.
 */
export function createTimeout(
  callback: () => void,
  delay: number,
): TimeoutResult {
  const isPending = signal(false);
  let id: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    clearTimeout(id);
    id = undefined;
    isPending(false);
  };

  const start = () => {
    if (isPending()) return;
    isPending(true);
    id = setTimeout(() => {
      isPending(false);
      id = undefined;
      callback();
    }, delay);
  };

  const reset = () => {
    stop();
    start();
  };

  start();

  const cleanup = () => stop();
  onCleanup(cleanup);

  return {
    isPending: isPending as Computed<boolean>,
    start,
    stop,
    reset,
    [Symbol.dispose]: cleanup,
  };
}
