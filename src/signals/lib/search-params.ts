import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

type SearchParamsResult = {
  params: Computed<URLSearchParams>;
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
} & Disposable;

function readParams(): URLSearchParams {
  return new URLSearchParams(
    typeof location !== "undefined" ? location.search : "",
  );
}

/**
 * Returns reactive access to the URL's search params.  Writing via `set` /
 * `delete` updates both `location.search` and the reactive signal.
 */
export function createSearchParams(): SearchParamsResult {
  const params = signal<URLSearchParams>(readParams());

  const onPopState = () => params(readParams());

  const cleanup = createEventListener(window, "popstate", onPopState);

  const get = (key: string) => params().get(key);

  const set = (key: string, value: string) => {
    const next = readParams();
    next.set(key, value);
    history.replaceState(null, "", `?${next.toString()}`);
    params(next);
  };

  const del = (key: string) => {
    const next = readParams();
    next.delete(key);
    const qs = next.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
    params(next);
  };

  return {
    params: params as Computed<URLSearchParams>,
    get,
    set,
    delete: del,
    [Symbol.dispose]: cleanup,
  };
}
