import { on } from "./event-listener.ts";

/**
 * Fires `handler` whenever a pointer-down event occurs outside `target`.
 *
 * Built on a `document` `pointerdown` listener so it works for both mouse and
 * touch input.  Cleanup is registered automatically when called inside an
 * effect or scope.
 */
export function onClickOutside(
  target: Element,
  handler: (e: PointerEvent) => void,
): () => void {
  const listener = (e: PointerEvent) => {
    if (!target.contains(e.target as Node)) {
      handler(e);
    }
  };

  return on(document, "pointerdown", listener);
}
