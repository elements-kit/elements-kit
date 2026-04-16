import { type Computed, onCleanup, signal } from "../index.ts";

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

  if (el) {
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
  }

  const cleanup = () => {
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("focusout", onFocusOut);
  };
  onCleanup(cleanup);

  return Object.assign(focused as Computed<boolean>, {
    [Symbol.dispose]: cleanup,
  });
}
