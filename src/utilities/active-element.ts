import { type Computed, computed } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";
import { isBrowser } from "./environment.ts";

/**
 * Returns a read-only `Computed<Element | null>` bound to `document.activeElement`.
 * Reacts to `focusin` and `focusout` events on the document. Outside a browser,
 * always `null`.
 */
function createActiveElement(): Computed<Element | null> {
  if (!isBrowser) {
    return computed(() => null);
  }
  const [active] = sync(
    fromEvent(document, ["focusin", "focusout"]),
    () => document.activeElement,
  );
  return active;
}

export const activeElement = createActiveElement();
