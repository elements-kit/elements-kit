import { type Signal, effect, onCleanup, signal } from "@/signals/index.ts";
import { on } from "./event-listener.ts";

type ElementScrollResult = {
  /** Horizontal scroll position (writable — setting it scrolls the element). */
  x: Signal<number>;
  /** Vertical scroll position (writable — setting it scrolls the element). */
  y: Signal<number>;
} & Disposable;

/**
 * Returns writable signals for an element's scroll position.
 *
 * Reading `x()` / `y()` returns the current `scrollLeft` / `scrollTop`.
 * Writing `x(100)` or `y(200)` scrolls the element to that position.
 */
export function elementScroll(target: Element): ElementScrollResult {
  const el = target;
  const x = signal(el?.scrollLeft ?? 0);
  const y = signal(el?.scrollTop ?? 0);

  let skipEvent = false;

  const handler = () => {
    if (skipEvent) {
      skipEvent = false;
      return;
    }
    if (!el) return;
    x(el.scrollLeft);
    y(el.scrollTop);
  };

  const cleanup = el ? on(el, "scroll", handler, { passive: true }) : () => {};

  // Sync writes back to the element.
  const stopX = effect(() => {
    const val = x();
    if (el && el.scrollLeft !== val) {
      skipEvent = true;
      el.scrollLeft = val;
    }
  });

  const stopY = effect(() => {
    const val = y();
    if (el && el.scrollTop !== val) {
      skipEvent = true;
      el.scrollTop = val;
    }
  });

  const dispose = () => {
    cleanup();
    stopX();
    stopY();
  };
  onCleanup(dispose);

  return {
    x: x as Signal<number>,
    y: y as Signal<number>,
    [Symbol.dispose]: dispose,
  };
}
