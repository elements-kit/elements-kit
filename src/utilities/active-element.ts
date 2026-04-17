import type { Computed } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Returns a read-only `Computed<Element | null>` bound to `document.activeElement`.
 * Reacts to `focusin` and `focusout` events on the document.
 */
function createActiveElement(): Computed<Element | null> {
  const [active] = sync(fromEvent(document, ["focusin", "focusout"]), () =>
    typeof document !== "undefined" ? document.activeElement : null,
  );
  return active;
}

export const activeElement = createActiveElement();
