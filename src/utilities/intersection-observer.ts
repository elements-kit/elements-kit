import { observe } from "./_observe.ts";

/**
 * Raw `IntersectionObserver` wrapper with automatic cleanup.
 * Use `createIsInViewport` for the common boolean case.
 */
export function createIntersectionObserver(
  target: Element,
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
): Disposable {
  return observe(new IntersectionObserver(callback, options), (o) => {
    if (target) o.observe(target);
  });
}
