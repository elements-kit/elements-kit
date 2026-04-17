import {
  type Computed,
  type MaybeReactive,
  computed,
} from "../signals/index.ts";

/**
 * Reactively tests a URL source against a
 * [`URLPattern`](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API).
 *
 * Returns a `Computed<URLPatternResult | null>` that re-evaluates whenever
 * the source changes.
 *
 * @param source   The URL to match — a plain string/URL or a reactive getter.
 * @param input    A `URLPatternInput` passed to `new URLPattern(input, options)`.
 * @param options  Optional `URLPatternOptions` (e.g. `{ ignoreCase: true }`).
 */
export function createURLPattern(
  source: MaybeReactive<string | URL>,
  input?: URLPatternInput,
  options?: URLPatternOptions,
): Computed<URLPatternResult | null> {
  const pattern =
    input != null
      ? options != null
        ? new URLPattern(input, options)
        : new URLPattern(input)
      : undefined;

  const getUrl = typeof source === "function" ? source : () => source;

  return computed(() => {
    if (!pattern) return null;
    const url = getUrl();
    const href = typeof url === "string" ? url : url.href;
    return pattern.exec(href);
  });
}
