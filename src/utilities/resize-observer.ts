import { observe } from "./_observe.ts";

/**
 * Raw `ResizeObserver` wrapper with automatic cleanup.
 * Use `createElementRect` for the common case.
 */
export function createResizeObserver(
  target: Element,
  callback: ResizeObserverCallback,
): Disposable {
  return observe(new ResizeObserver(callback), (o) => {
    if (target) o.observe(target);
  });
}
