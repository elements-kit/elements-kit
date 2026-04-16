import type { Signal } from "../index.ts";
import { fromEvent, sync } from "./event-driven.ts";

type SearchParamOptions<T> = {
  /** Custom serialiser (default `String`). */
  serialise?: (value: T) => string;
  /** Custom deserialiser (default identity → `string`). */
  deserialise?: (raw: string) => T;
  /** History method to use when writing (default `"replace"`). */
  history?: "replace" | "push";
};

/**
 * Returns a writable `Signal<T | null>` bound to a single URL search parameter.
 *
 * Reading returns the deserialised value (or `null` when absent).
 * Writing serialises and updates `location.search` via `replaceState`.
 * Reacts to `popstate` so back/forward navigation is reflected.
 */
export function createSearchParam<T = string>(
  key: string,
  options?: SearchParamOptions<T>,
): Signal<T | null> {
  const serialise = options?.serialise ?? ((v: T) => String(v));
  const deserialise =
    options?.deserialise ?? ((raw: string) => raw as unknown as T);
  const navigate =
    options?.history === "push"
      ? (url: string) => history.pushState(null, "", url)
      : (url: string) => history.replaceState(null, "", url);

  const read = (): T | null => {
    if (typeof location === "undefined") return null;
    const raw = new URLSearchParams(location.search).get(key);
    if (raw === null) return null;
    try {
      return deserialise(raw);
    } catch {
      return null;
    }
  };

  const write = (value: T | null) => {
    const params = new URLSearchParams(location.search);
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, serialise(value));
    }
    const qs = params.toString();
    navigate(qs ? `?${qs}` : location.pathname);
  };

  const [s] = sync(fromEvent(window, "popstate"), read, write);

  return s;
}
