import { type Computed, onCleanup, signal } from "../index.ts";

/**
 * Returns a `Computed<boolean>` that is `true` while `target` is intersecting
 * the viewport (or a custom root defined via `options`).
 */
export function createIsInViewport(
  target: Element | (() => Element | null),
  options?: IntersectionObserverInit,
): Computed<boolean> & Disposable {
  const visible = signal(false);

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      visible(entry.isIntersecting);
    }
  }, options);

  const el = typeof target === "function" ? target() : target;
  if (el) observer.observe(el);

  const cleanup = () => observer.disconnect();
  onCleanup(cleanup);

  return Object.assign(visible as Computed<boolean>, {
    [Symbol.dispose]: cleanup,
  });
}
