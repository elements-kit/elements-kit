import { type Computed, onCleanup, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

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

  const removeListener = createEventListener(
    target as Window,
    "scroll",
    handler,
    { passive: true },
  );
  onCleanup(() => clearTimeout(timer));

  return Object.assign(scrolling as Computed<boolean>, {
    [Symbol.dispose]: () => {
      clearTimeout(timer);
      removeListener();
    },
  });
}
