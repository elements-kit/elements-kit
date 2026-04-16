import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Returns a `Computed<boolean>` that is `true` while focus is anywhere inside
 * `target` (including `target` itself).
 */
export function createIsFocusWithin(target: Element): Computed<boolean> {
  const focused = signal(false);

  const el = target;

  if (el) {
    createEventListener(el, "focusin", () => focused(true));
    createEventListener(el, "focusout", (e) => {
      if (!el.contains((e as FocusEvent).relatedTarget as Node)) focused(false);
    });
  }

  return focused as Computed<boolean>;
}
