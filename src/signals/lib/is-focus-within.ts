import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Returns a `Computed<boolean>` that is `true` while focus is anywhere inside
 * `target` (including `target` itself).
 */
export function createIsFocusWithin(
  target: Element | (() => Element | null),
): Computed<boolean> {
  const focused = signal(false);

  const el = typeof target === "function" ? target() : target;

  const onFocusIn = (e: FocusEvent) => {
    const t = typeof target === "function" ? target() : target;
    if (t && t.contains(e.target as Node)) focused(true);
  };

  const onFocusOut = (e: FocusEvent) => {
    const t = typeof target === "function" ? target() : target;
    if (t && !t.contains(e.relatedTarget as Node)) focused(false);
  };

  if (el) {
    createEventListener(document, "focusin", onFocusIn);
    createEventListener(document, "focusout", onFocusOut);
  }

  return focused as Computed<boolean>;
}
