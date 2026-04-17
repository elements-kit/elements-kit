import type { Computed } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Returns a read-only `Computed<string>` bound to `location.pathname`.
 * Reacts to `popstate`, `pushstate`, `replacestate`, and `hashchange` events.
 */
function createPathname(): Computed<string> {
  const [pathname] = sync(
    fromEvent(window, ["popstate", "pushstate", "replacestate", "hashchange"]),
    () => (typeof location !== "undefined" ? location.pathname : ""),
  );
  return pathname;
}

export const pathname = createPathname();
