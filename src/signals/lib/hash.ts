import { type Signal } from "../index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Returns a writable `Signal<string>` that stays in sync with `location.hash`
 * (including the leading `#`).  Writing the signal updates `location.hash`.
 */
export function createHash(): Signal<string> {
  const [hash] = sync(
    fromEvent(window, "hashchange"),
    () => (typeof location !== "undefined" ? location.hash : ""),
    (v) => {
      location.hash = v;
    },
  );

  return hash;
}
