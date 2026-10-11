import type { Computed } from "@/signals/index.ts";
import { computed, onCleanup, signal, trigger } from "@/signals/index.ts";
import { fromEvent } from "./event-driven.ts";
import { isBrowser } from "./environment.ts";

type LocationResult = {
  hash: Computed<string>;
  href: Computed<string>;
  pathname: Computed<string>;
  search: Computed<string>;
};

const EVENTS = ["popstate", "pushstate", "replacestate", "hashchange"];

const read = (prop: keyof Location): string =>
  isBrowser ? String(location[prop]) : "";

/**
 * Returns reactive signals for the four commonly used `location` properties:
 * `hash`, `href`, `pathname`, and `search`.
 *
 * All four share a single event listener set, so creating one `LocationResult`
 * is cheaper than creating four separate signals.
 *
 * **Custom events note:** `pushstate` and `replacestate` are not native DOM
 * events — they must be dispatched by your router or by patching `history`.
 * Back/forward navigation via `popstate` always works without any setup.
 *
 * Outside a browser, every signal reads the empty string.
 */
function createLocation(): LocationResult {
  if (!isBrowser) {
    return {
      hash: computed(() => ""),
      href: computed(() => ""),
      pathname: computed(() => ""),
      search: computed(() => ""),
    };
  }

  const tick = signal<undefined>(undefined);

  const cleanup = fromEvent(window, EVENTS)(() => trigger(tick));
  onCleanup(cleanup);

  const hash = computed(() => {
    tick();
    return read("hash");
  });
  const href = computed(() => {
    tick();
    return read("href");
  });
  const pathname = computed(() => {
    tick();
    return read("pathname");
  });
  const search = computed(() => {
    tick();
    return read("search");
  });

  hash();
  href();
  pathname();
  search();

  return { hash, href, pathname, search };
}

export const currentLocation = createLocation();
