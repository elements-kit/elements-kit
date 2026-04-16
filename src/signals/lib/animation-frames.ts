import { type Computed, onCleanup, signal } from "../index.ts";

type AnimationFramesResult = {
  isRunning: Computed<boolean>;
  delta: Computed<number>;
  elapsed: Computed<number>;
  start(): void;
  stop(): void;
} & Disposable;

/**
 * RAF loop with pause/resume, delta time, and elapsed time tracking.
 *
 * Starts paused — call `start()` to begin.
 */
export function createAnimationFrames(): AnimationFramesResult {
  const isRunning = signal(false);
  const delta = signal(0);
  const elapsed = signal(0);

  let rafId: number | undefined;
  let lastTime: number | undefined;

  const loop = (time: number) => {
    if (lastTime !== undefined) {
      const d = time - lastTime;
      delta(d);
      elapsed(elapsed() + d);
    }
    lastTime = time;
    rafId = requestAnimationFrame(loop);
  };

  const start = () => {
    if (isRunning()) return;
    lastTime = undefined;
    isRunning(true);
    rafId = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
      rafId = undefined;
    }
    lastTime = undefined;
    isRunning(false);
  };

  const cleanup = () => stop();
  onCleanup(cleanup);

  return {
    isRunning: isRunning as Computed<boolean>,
    delta: delta as Computed<number>,
    elapsed: elapsed as Computed<number>,
    start,
    stop,
    [Symbol.dispose]: cleanup,
  };
}
