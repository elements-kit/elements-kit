import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Returns a `Computed<boolean>` that is `true` while the pointer is over
 * `target`.  Uses `pointerenter` / `pointerleave` so it works for both mouse
 * and touch/stylus input.
 */
export function createHover(
  target: Element | (() => Element | null),
): Computed<boolean> & Disposable {
  const hovered = signal(false);

  const el = typeof target === "function" ? target() : target;

  const onEnter = () => hovered(true);
  const onLeave = () => hovered(false);

  const cleanups: Array<() => void> = [];
  if (el) {
    cleanups.push(createEventListener(el, "pointerenter", onEnter));
    cleanups.push(createEventListener(el, "pointerleave", onLeave));
  }
  const cleanup = () => cleanups.forEach((fn) => fn());

  return Object.assign(hovered as Computed<boolean>, {
    [Symbol.dispose]: cleanup,
  });
}
