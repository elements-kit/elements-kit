export const isBrowser = typeof window !== "undefined";

import {
  effect,
  type Computed,
  computed,
  trigger,
  effectScope,
} from "../signals";

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
  const state = computed<boolean>(() => mql.matches);
  const handler = trigger.bind(null, state);

  mql.addEventListener("change", handler);
  effect(() => {
    effectScope(() => {
      return () => {
        mql.removeEventListener("change", handler);
        console.log("cleanup media query listener");
      };
    });
  });

  return state;
}
