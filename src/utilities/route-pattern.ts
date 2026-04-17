import { type Computed } from "@/signals/index.ts";
import { createURLPattern } from "./url-pattern.ts";
import { href } from "./href.ts";

/**
 * Matches the current `location.href` against a
 * [`URLPattern`](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API).
 *
 * Shorthand for `createURLPattern(createHref(), input, options)`.
 * Reacts to `popstate`, `pushstate`, `replacestate`, and `hashchange`.
 *
 * @param input    A `URLPatternInput` (e.g. `{ pathname: "/users/:id" }`).
 * @param options  Optional `URLPatternOptions`.
 */
export function createRoutePattern(
  input: URLPatternInput,
  options?: URLPatternOptions,
): Computed<URLPatternResult | null> {
  return createURLPattern(href, input, options);
}
