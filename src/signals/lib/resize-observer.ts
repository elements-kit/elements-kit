import { onCleanup } from "../index.ts";

/**
 * Raw `ResizeObserver` wrapper with automatic cleanup.
 * Use `createElementRect` for the common case.
 */
export function createResizeObserver(
  target: Element,
  callback: ResizeObserverCallback,
): Disposable {
  const observer = new ResizeObserver(callback);

  if (target) observer.observe(target);

  const cleanup = () => observer.disconnect();
  onCleanup(cleanup);

  return { [Symbol.dispose]: cleanup };
}
