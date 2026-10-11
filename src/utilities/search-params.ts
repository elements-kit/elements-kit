import type { Computed } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Returns a read-only `Computed<string | null>` bound to a single URL search
 * parameter.
 *
 * Returns the raw string value, or `null` when absent.
 * Reacts to `popstate` so back/forward navigation is reflected.
 */
export function createSearchParam(key: string): Computed<string | null> {
  const read = (): string | null => {
    if (typeof location === "undefined") return null;
    return new URLSearchParams(location.search).get(key);
  };

  const [s] = sync(
    fromEvent(window, ["popstate", "pushstate", "replacestate"]),
    read,
  );

  return s;
}
