import { type Signal } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";

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
export function createElementScroll(target: Element): ElementScrollResult {
  const el = target;
  const scroll = fromEvent(el, "scroll");

  const [x] = sync(
    scroll,
    () => el.scrollLeft,
    (v) => {
      el.scrollLeft = v;
    },
  );
  const [y] = sync(
    scroll,
    () => el.scrollTop,
    (v) => {
      el.scrollTop = v;
    },
  );

  return {
    x: x as Signal<number>,
    y: y as Signal<number>,
    [Symbol.dispose]: () => {},
  };
}
