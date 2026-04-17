import type { Computed } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Returns a read-only `Computed<string>` bound to `location.hash`.
 * Reacts to `popstate`, `pushstate", "replacestate", and "hashchange" events.
 */
function createHash(): Computed<string> {
  const [hash] = sync(
    fromEvent(window, ["popstate", "pushstate", "replacestate", "hashchange"]),
    () => (typeof location !== "undefined" ? location.hash : ""),
  );
  return hash;
}

export const hash = createHash();
