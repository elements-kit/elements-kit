import { type Computed, signal } from "@/signals/index.ts";
import { on } from "./event-listener.ts";

/**
 * Returns a `Computed<boolean>` that is `true` while focus is anywhere inside
 * `target` (including `target` itself).
 */
export function createFocusWithin(target: Element): Computed<boolean> {
  const focused = signal(false);

  const el = target;

  if (el) {
    on(el, "focusin", () => focused(true));
    on(el, "focusout", (e) => {
      if (!el.contains((e as FocusEvent).relatedTarget as Node)) focused(false);
    });
  }

  return focused as Computed<boolean>;
}
