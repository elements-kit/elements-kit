import { onCleanup } from "@/signals/index.ts";

/**
 * Raw `IntersectionObserver` wrapper with automatic cleanup.
 * Use `createIsInViewport` for the common boolean case.
 */
export function createIntersectionObserver(
  target: Element,
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
): Disposable {
  const observer = new IntersectionObserver(callback, options);

  if (target) observer.observe(target);

  const cleanup = () => observer.disconnect();
  onCleanup(cleanup);

  return { [Symbol.dispose]: cleanup };
}
