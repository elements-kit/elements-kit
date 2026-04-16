import { type Computed, signal } from "../index.ts";
import { createIntersectionObserver } from "./intersection-observer.ts";

/**
 * Returns a `Computed<boolean>` that is `true` while `target` is intersecting
 * the viewport (or a custom root defined via `options`).
 */
export function createIsInViewport(
  target: Element | (() => Element | null),
  options?: IntersectionObserverInit,
): Computed<boolean> {
  const visible = signal(false);

  createIntersectionObserver(
    target,
    (entries) => {
      for (const entry of entries) {
        visible(entry.isIntersecting);
      }
    },
    options,
  );

  return visible as Computed<boolean>;
}
