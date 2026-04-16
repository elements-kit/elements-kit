import { type Computed, signal } from "../index.ts";
import { createResizeObserver } from "./resize-observer.ts";

/**
 * Observes the content-box size of `target` using a `ResizeObserver` and
 * returns reactive `width` and `height` computeds.
 *
 * Supports a reactive getter — pass `() => element` when the target element
 * is not known at call time.
 */
export function createElementSize(
  target: Element | (() => Element | null),
): { width: Computed<number>; height: Computed<number> } & Disposable {
  const w = signal(0);
  const h = signal(0);

  const observer = createResizeObserver(target, (entries) => {
    for (const entry of entries) {
      w(entry.contentRect.width);
      h(entry.contentRect.height);
    }
  });

  const el = typeof target === "function" ? target() : target;
  if (el) {
    const rect = el.getBoundingClientRect();
    w(rect.width);
    h(rect.height);
  }

  return {
    width: w as Computed<number>,
    height: h as Computed<number>,
    [Symbol.dispose]: observer[Symbol.dispose],
  };
}
