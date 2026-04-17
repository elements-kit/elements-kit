export const isBrowser = typeof window !== "undefined";

import { type Computed, signal } from "@/signals/index.ts";
import { fromEvent, sync } from "@/utilities/event-driven.ts";

/**
 * Creates a signal that tracks a CSS media query.
 *
 * @param query The media query string (e.g. '(max-width: 600px)')
 * @param defaultState The default value (for SSR/hydration)
 * @returns Computed<boolean> that is true if the query matches
 */
export function createMediaQuery(
  query: string,
  defaultState?: boolean,
): Computed<boolean> {
  if (!isBrowser) return signal(defaultState ?? false);
  const mql = window.matchMedia(query);

  const [state] = sync(fromEvent(mql, "change"), () => mql.matches);

  return state;
}
