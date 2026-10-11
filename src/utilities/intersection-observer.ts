import { observe } from "./_observe.ts";

/**
 * Raw `IntersectionObserver` wrapper with automatic cleanup.
 * Use `createIsInViewport` for the common boolean case.
 *
 * The platform default is `root: null`, which observes intersections with
 * the **viewport** — not with `target`'s nearest scrollable ancestor. For a
 * sentinel inside an in-page scroll container, pass `root: containerEl`
 * explicitly; otherwise the sentinel reads as "intersecting" the viewport
 * and fires immediately and repeatedly.
 *
 * @example
 * ```ts
 * // In-page scroll container — pass `root` so intersection is computed
 * // against the container's scrollport, not the viewport.
 * createIntersectionObserver(
 *   sentinelEl,
 *   ([entry]) => { if (entry.isIntersecting) loadMore.run(); },
 *   { root: containerEl, rootMargin: "100px" },
 * );
 * ```
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
