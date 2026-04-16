import { type Computed, signal } from "../index.ts";
import { createIntersectionObserver } from "./intersection-observer.ts";

/**
 * Tracks the visibility ratio of `target` as a number between 0 and 1.
 *
 * Unlike `createIsInViewport` (which returns a boolean), this provides the
 * precise intersection ratio, useful for scroll-linked animations or
 * lazy-loading with progressive thresholds.
 *
 * @param target - The element to observe.
 * @param options - IntersectionObserver options.  Set `threshold` to an array
 *                  of ratios for fine-grained updates (e.g. `[0, 0.25, 0.5, 0.75, 1]`).
 */
export function createElementVisibility(
  target: Element | (() => Element | null),
  options?: IntersectionObserverInit,
): Computed<number> {
  const ratio = signal(0);

  createIntersectionObserver(
    target,
    (entries) => {
      for (const entry of entries) {
        ratio(entry.intersectionRatio);
      }
    },
    options,
  );

  return ratio as Computed<number>;
}
