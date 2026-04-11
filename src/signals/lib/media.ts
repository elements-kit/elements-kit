export const isBrowser = typeof window !== "undefined";

import { type Computed, computed, onCleanup, signal } from "..";

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
  if (!isBrowser) return computed(() => defaultState ?? false);
  const mql = window.matchMedia(query);
  const state = signal<boolean>(mql.matches);
  const handler = state.bind(null, mql.matches);

  mql.addEventListener("change", handler);
  const cleanup = () => {
    mql.removeEventListener("change", handler);
  };

  onCleanup(cleanup);
  return Object.assign(state, {
    [Symbol.dispose]: cleanup,
  });
}
