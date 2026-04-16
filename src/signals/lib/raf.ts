import { type Computed, onCleanup, signal } from "../index.ts";

type RafResult = {
  isRunning: Computed<boolean>;
  start(): void;
  stop(): void;
} & Disposable;

/**
 * Looping `requestAnimationFrame` wrapper with start/stop control.
 *
 * The callback receives the `DOMHighResTimeStamp` elapsed since page load.
 * Starts running immediately on creation.
 */
export function createRaf(callback: (time: number) => void): RafResult {
  const isRunning = signal(false);
  let rafId: number | undefined;

  const loop = (time: number) => {
    callback(time);
    if (isRunning()) rafId = requestAnimationFrame(loop);
  };

  const start = () => {
    if (isRunning()) return;
    isRunning(true);
    rafId = requestAnimationFrame(loop);
  };

  const stop = () => {
    isRunning(false);
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
      rafId = undefined;
    }
  };

  start();

  const cleanup = () => stop();
  onCleanup(cleanup);

  return Object.assign(
    { isRunning: isRunning as Computed<boolean>, start, stop },
    { [Symbol.dispose]: cleanup },
  );
}
