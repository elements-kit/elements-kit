import { type Computed, onCleanup, signal } from "../index.ts";

/**
 * Returns a `Computed<boolean>` that is `true` while the user is actively
 * scrolling `target` (defaults to `window`).
 *
 * Sets to `false` after `delay` ms of no scroll events (default: 150 ms).
 */
export function createScrolling(
  target: Element | Window = window,
  delay = 150,
): Computed<boolean> & Disposable {
  const scrolling = signal(false);
  let timer: ReturnType<typeof setTimeout>;

  const handler = () => {
    scrolling(true);
    clearTimeout(timer);
    timer = setTimeout(() => scrolling(false), delay);
  };

  target.addEventListener("scroll", handler, { passive: true });

  const cleanup = () => {
    clearTimeout(timer);
    target.removeEventListener("scroll", handler);
  };
  onCleanup(cleanup);

  return Object.assign(scrolling as Computed<boolean>, {
    [Symbol.dispose]: cleanup,
  });
}
