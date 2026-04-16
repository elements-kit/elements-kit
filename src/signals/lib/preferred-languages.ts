import { type Computed } from "../index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Returns a `Computed<readonly string[]>` that reactively tracks
 * `navigator.languages`.  Updates when the user changes their
 * preferred language in the browser.
 */
export function createPreferredLanguages(): Computed<readonly string[]> {
  const [languages] = sync(
    fromEvent(window, "languagechange"),
    () => navigator.languages,
  );

  return languages;
}
