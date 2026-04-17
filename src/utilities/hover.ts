import { type Computed, signal } from "@/signals/index.ts";
import { on } from "./event-listener.ts";

/**
 * Returns a `Computed<boolean>` that is `true` while the pointer is over
 * `target`.  Uses `pointerenter` / `pointerleave` so it works for both mouse
 * and touch/stylus input.
 */
export function createHover(target: Element): Computed<boolean> {
  const hovered = signal(false);

  const onEnter = () => hovered(true);
  const onLeave = () => hovered(false);

  if (target) {
    on(target, "pointerenter", onEnter);
    on(target, "pointerleave", onLeave);
  }

  return hovered as Computed<boolean>;
}
