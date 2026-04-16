import { type Computed, onCleanup, signal } from "../index.ts";

/**
 * Returns a `Computed<number>` tracking the cumulative vertical mouse-wheel
 * delta (positive = scrolled down).
 */
export function createMouseWheel(): Computed<number> & Disposable {
  const delta = signal(0);

  const handler = (e: WheelEvent) => {
    delta(delta() + e.deltaY);
  };

  window.addEventListener("wheel", handler, { passive: true });

  const cleanup = () => window.removeEventListener("wheel", handler);
  onCleanup(cleanup);

  return Object.assign(delta as Computed<number>, {
    [Symbol.dispose]: cleanup,
  });
}
