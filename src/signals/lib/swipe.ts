import { type Computed, onCleanup, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

type SwipeDirection = "up" | "down" | "left" | "right" | "none";

type SwipeResult = {
  /** The direction of the last completed swipe. */
  direction: Computed<SwipeDirection>;
  /** `true` while a swipe gesture is in progress. */
  isSwiping: Computed<boolean>;
  /** Horizontal distance of the current swipe. */
  deltaX: Computed<number>;
  /** Vertical distance of the current swipe. */
  deltaY: Computed<number>;
} & Disposable;

/**
 * Detects swipe gestures on `target`.
 *
 * @param target    - The element to listen on (defaults to `window`).
 * @param threshold - Minimum distance in pixels to qualify as a swipe (default: 50).
 */
export function createSwipe(
  target: Element | Window = window,
  threshold = 50,
): SwipeResult {
  const direction = signal<SwipeDirection>("none");
  const isSwiping = signal(false);
  const deltaX = signal(0);
  const deltaY = signal(0);

  let startX = 0;
  let startY = 0;

  const cleanups: Array<() => void> = [];

  cleanups.push(
    createEventListener(target as Window, "pointerdown", (e: PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      isSwiping(true);
      direction("none");
      deltaX(0);
      deltaY(0);
    }),
  );

  cleanups.push(
    createEventListener(target as Window, "pointermove", (e: PointerEvent) => {
      if (!isSwiping()) return;
      deltaX(e.clientX - startX);
      deltaY(e.clientY - startY);
    }),
  );

  cleanups.push(
    createEventListener(target as Window, "pointerup", () => {
      if (!isSwiping()) return;
      isSwiping(false);
      const dx = deltaX();
      const dy = deltaY();
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < threshold && absDy < threshold) {
        direction("none");
      } else if (absDx > absDy) {
        direction(dx > 0 ? "right" : "left");
      } else {
        direction(dy > 0 ? "down" : "up");
      }
    }),
  );

  const cleanup = () => cleanups.forEach((fn) => fn());
  onCleanup(cleanup);

  return {
    direction: direction as Computed<SwipeDirection>,
    isSwiping: isSwiping as Computed<boolean>,
    deltaX: deltaX as Computed<number>,
    deltaY: deltaY as Computed<number>,
    [Symbol.dispose]: cleanup,
  };
}
