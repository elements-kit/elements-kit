import { type Computed, signal } from "../index.ts";
import { createIntersectionObserver } from "./intersection-observer.ts";

/**
 * Returns a `Computed<boolean>` that is `true` while `target` is intersecting
 * the viewport (or a custom root defined via `options`).
 */
export function createIsInViewport(
  target: Element | (() => Element | null),
  options?: IntersectionObserverInit,
): Computed<boolean> & Disposable {
  const visible = signal(false);

  const observer = createIntersectionObserver(
    target,
    (entries) => {
      for (const entry of entries) {
        visible(entry.isIntersecting);
      }
    },
    options,
  );

  return Object.assign(visible as Computed<boolean>, {
    [Symbol.dispose]: observer[Symbol.dispose],
  });
}
