import { type Computed, computed } from "../index.ts";

/**
 * Reactively tests a URL source against a
 * [`URLPattern`](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API).
 *
 * Returns a `Computed<URLPatternResult | null>` that re-evaluates whenever
 * the source changes.
 *
 * @param source   A reactive getter returning the current URL (string or `URL`).
 * @param input    A `URLPatternInput` passed to `new URLPattern(input, options)`.
 * @param options  Optional `URLPatternOptions` (e.g. `{ ignoreCase: true }`).
 *
 * @example
 * ```ts
 * const url = computed(() => new URL(location.href));
 *
 * const result = createURLPattern(url, { pathname: "/users/:id" });
 *
 * effect(() => {
 *   const r = result();
 *   if (r) console.log(r.pathname.groups.id);
 * });
 * ```
 */
export function createURLPattern(
  source: () => string | URL,
  input?: URLPatternInput,
  options?: URLPatternOptions,
): Computed<URLPatternResult | null> {
  const pattern =
    input != null
      ? options != null
        ? new URLPattern(input, options)
        : new URLPattern(input)
      : undefined;

  return computed(() => {
    if (!pattern) return null;
    const url = source();
    const href = typeof url === "string" ? url : url.href;
    return pattern.exec(href);
  });
}
