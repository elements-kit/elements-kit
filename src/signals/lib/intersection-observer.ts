import { onCleanup } from "../index.ts";

/**
 * Raw `IntersectionObserver` wrapper with automatic cleanup.
 * Use `createIsInViewport` for the common boolean case.
 */
export function createIntersectionObserver(
  target: Element | (() => Element | null),
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
): Disposable {
  const observer = new IntersectionObserver(callback, options);

  const el = typeof target === "function" ? target() : target;
  if (el) observer.observe(el);

  const cleanup = () => observer.disconnect();
  onCleanup(cleanup);

  return { [Symbol.dispose]: cleanup };
}
