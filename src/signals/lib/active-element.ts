import { type Computed } from "../index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Returns a `Computed` that tracks `document.activeElement`.
 * Updates on every `focusin` / `focusout` event bubbling through the document.
 */
export function createActiveElement(): Computed<Element | null> {
  const [active] = sync(fromEvent(document, ["focusin", "focusout"]), () =>
    typeof document !== "undefined" ? document.activeElement : null,
  );

  return active;
}
