import { onCleanup } from "../index.ts";
import { createIntersectionObserver } from "./intersection-observer.ts";

/**
 * Fires `handler` when `sentinel` enters the viewport, useful for
 * infinite-scroll patterns.
 *
 * Place a sentinel element at the bottom of your scrollable list and call
 * this helper — `handler` is invoked each time the sentinel becomes visible.
 *
 * @param sentinel - A DOM element placed at the scroll boundary.
 * @param handler  - Called when the sentinel enters the viewport.
 * @param options  - IntersectionObserver options (e.g. custom `rootMargin`).
 */
export function createInfiniteScroll(
  sentinel: Element | (() => Element | null),
  handler: () => void,
  options?: IntersectionObserverInit,
): Disposable {
  const observer = createIntersectionObserver(
    sentinel,
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          handler();
        }
      }
    },
    options,
  );

  return observer;
}
