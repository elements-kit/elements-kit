import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Returns a `Computed<number>` tracking the cumulative vertical mouse-wheel
 * delta (positive = scrolled down).
 */
export function createMouseWheel(): Computed<number> {
  const delta = signal(0);

  const handler = (e: WheelEvent) => {
    delta(delta() + e.deltaY);
  };

  createEventListener(window, "wheel", handler, {
    passive: true,
  });

  return delta as Computed<number>;
}
