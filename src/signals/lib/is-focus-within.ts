import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Returns a `Computed<boolean>` that is `true` while focus is anywhere inside
 * `target` (including `target` itself).
 */
export function createIsFocusWithin(
  target: Element | (() => Element | null),
): Computed<boolean> & Disposable {
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

  const cleanups: Array<() => void> = [];
  if (el) {
    cleanups.push(createEventListener(document, "focusin", onFocusIn));
    cleanups.push(createEventListener(document, "focusout", onFocusOut));
  }
  const cleanup = () => cleanups.forEach((fn) => fn());

  return Object.assign(focused as Computed<boolean>, {
    [Symbol.dispose]: cleanup,
  });
}
