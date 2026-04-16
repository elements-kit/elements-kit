import { createEventListener } from "./event-listener.ts";

/**
 * Fires `handler` whenever a pointer-down event occurs outside `target`.
 *
 * Built on a `document` `pointerdown` listener so it works for both mouse and
 * touch input.  Cleanup is registered automatically when called inside an
 * effect or scope.
 */
export function createOnClickOutside(
  target: Element | (() => Element | null),
  handler: (e: PointerEvent) => void,
): void {
  const getTarget = typeof target === "function" ? target : () => target;

  const listener = (e: PointerEvent) => {
    const el = getTarget();
    if (!el) return;
    if (!el.contains(e.target as Node)) {
      handler(e);
    }
  };

  createEventListener(document, "pointerdown", listener);
}
