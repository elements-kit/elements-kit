import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Returns a `Computed<number>` tracking the cumulative vertical mouse-wheel
 * delta (positive = scrolled down).
 */
export function createMouseWheel(): Computed<number> & Disposable {
  const delta = signal(0);

  const handler = (e: WheelEvent) => {
    delta(delta() + e.deltaY);
  };

  const cleanup = createEventListener(window, "wheel", handler, {
    passive: true,
  });

  return Object.assign(delta as Computed<number>, {
    [Symbol.dispose]: cleanup,
  });
}
