import type { Computed } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Returns a read-only `Computed<string>` bound to `location.href`.
 * Reacts to `popstate`, `pushstate`, `replacestate`, and `hashchange` events.
 */
function createHref(): Computed<string> {
  const [href] = sync(
    fromEvent(window, ["popstate", "pushstate", "replacestate", "hashchange"]),
    () => (typeof location !== "undefined" ? location.href : ""),
  );

  return href;
}

export const href = createHref();
