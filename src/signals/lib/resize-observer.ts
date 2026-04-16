import { onCleanup } from "../index.ts";

/**
 * Raw `ResizeObserver` wrapper with automatic cleanup.
 * Use `createElementSize` / `createElementRect` for the common cases.
 */
export function createResizeObserver(
  target: Element | (() => Element | null),
  callback: ResizeObserverCallback,
): Disposable {
  const observer = new ResizeObserver(callback);

  const el = typeof target === "function" ? target() : target;
  if (el) observer.observe(el);

  const cleanup = () => observer.disconnect();
  onCleanup(cleanup);

  return { [Symbol.dispose]: cleanup };
}
