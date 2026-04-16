import { type Computed } from "../index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Returns a `Computed<boolean>` that tracks the Page Visibility API.
 * `true` while the document is visible; `false` when hidden (minimised,
 * background tab, etc.).
 */
export function createIsDocumentVisible(): Computed<boolean> {
  const [visible] = sync(fromEvent(document, "visibilitychange"), () =>
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );

  return visible;
}
