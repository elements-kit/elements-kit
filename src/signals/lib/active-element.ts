import { type Computed } from "../index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Returns a `Computed` that tracks `document.activeElement`.
 * Updates on every `focusin` / `focusout` event bubbling through the document.
 */
export function createActiveElement(): Computed<Element | null> & Disposable {
  const [active, cleanup] = sync(
    fromEvent(document, ["focusin", "focusout"]),
    () => (typeof document !== "undefined" ? document.activeElement : null),
  );

  return Object.assign(active as Computed<Element | null>, {
    [Symbol.dispose]: cleanup,
  }) as Computed<Element | null> & Disposable;
}
