export const isBrowser = typeof window !== "undefined";

import { type Computed, signal } from "../index.ts";
import { fromEvent, sync } from "./event-driven.ts";

/**
 * Creates a signal that tracks a CSS media query.
 *
 * @param query The media query string (e.g. '(max-width: 600px)')
 * @param defaultState The default value (for SSR/hydration)
 * @returns Computed<boolean> that is true if the query matches
 */
export function createMediaSignal(
  query: string,
  defaultState?: boolean,
): Computed<boolean> {
  if (!isBrowser) return signal(defaultState ?? false);
  const mql = window.matchMedia(query);

  const [state, cleanup] = sync(fromEvent(mql, "change"), () => mql.matches);

  return Object.assign(state, {
    [Symbol.dispose]: cleanup,
  });
}
