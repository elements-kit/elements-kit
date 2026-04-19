import { type Computed, computed } from "../signals/index.ts";
import { currentLocation } from "./location.ts";

// ---------------------------------------------------------------------------
// History patch
// ---------------------------------------------------------------------------

const patchHistoryMethod = (method: "pushState" | "replaceState") => {
  const original = history[method];
  history[method] = function (
    this: History,
    data: any,
    unused: string,
    url?: string | URL | null | undefined,
  ) {
    const result = original.apply(this, [data, unused, url]);
    const event = new Event(method.toLowerCase());
    (event as any).state = data;
    window.dispatchEvent(event);
    return result;
  } as (typeof history)[typeof method];
};

/**
 * Monkey-patches `history.pushState` / `history.replaceState` to dispatch
 * `pushstate` and `replacestate` events on `window`.
 *
 * Needed because the platform only fires `popstate` on back/forward
 * navigation — `currentLocation` and anything else that reacts to
 * programmatic navigation needs these synthetic events.
 *
 * Call once at app boot (or before any router-driven navigation). Safe to
 * call outside a browser — it no-ops.
 */
export function patchHistory(): void {
  if (typeof window !== "undefined" && typeof history !== "undefined") {
    patchHistoryMethod("pushState");
    patchHistoryMethod("replaceState");
  }
}

// ---------------------------------------------------------------------------
// Programmatic navigation
// ---------------------------------------------------------------------------

type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

/**
 * Navigates to `url` via `history.pushState` (or `replaceState` when
 * `replace` is `true`).
 *
 * `history.pushState` / `replaceState` are patched once at module load so
 * all navigation — including third-party router calls — dispatches the
 * `pushstate` / `replacestate` events that `currentLocation` signals react to.
 */
export function navigate(
  url: string | URL,
  { replace = false, state = null }: NavigateOptions = {},
): void {
  if (replace) history.replaceState(state, "", url);
  else history.pushState(state, "", url);
}

// ---------------------------------------------------------------------------
// Anchor click predicate
// ---------------------------------------------------------------------------

/**
 * Returns `true` when a click event on an `<a>` element should be handled
 * client-side — same origin, primary button, no modifier keys, no download,
 * no `_blank` target. Walks up to the nearest anchor via `closest("a")`.
 *
 * Use alongside `navigate()` to intercept anchor clicks:
 *
 * ```ts
 * el.addEventListener("click", (e) => {
 *   if (isLocalNavigationEvent(e)) { e.preventDefault(); navigate(el.href); }
 * });
 * ```
 */
export function isLocalNavigationEvent(e: MouseEvent): boolean {
  if (e.button !== 0) return false;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const el =
    (e.currentTarget as Element)?.closest("a") ??
    (e.target as Element)?.closest("a");
  if (!el) return false;
  if (el.hasAttribute("download")) return false;
  if (el.getAttribute("target") === "_blank") return false;
  if (
    new URL((el as HTMLAnchorElement).href, location.href).origin !==
    location.origin
  )
    return false;
  return true;
}

// ---------------------------------------------------------------------------
// Reactive URL pattern matching
// ---------------------------------------------------------------------------

/**
 * Returns `Computed<boolean>` — `true` when the current URL matches `input`.
 * Uses `URLPattern.test()` — faster than `match` when you don't need
 * captured groups.
 *
 * Use object form: `{ pathname: "/users/:id" }`. Relative string patterns
 * require a base URL and will throw.
 *
 * Requires `urlpattern-polyfill` for Safari < 26 and Firefox < 142.
 */
export function matches(
  input: URLPatternInput,
  options?: URLPatternOptions,
): Computed<boolean> {
  const pattern = options
    ? new URLPattern(input, options)
    : new URLPattern(input);
  return computed(() => pattern.test(currentLocation.href()));
}

/**
 * Returns `Computed<URLPatternResult | null>` — the full match result when
 * the current URL matches `input`, `null` when it does not.
 * Use when you need captured groups (params). For a boolean gate,
 * prefer `matches()` which is faster.
 *
 * Use object form: `{ pathname: "/users/:id" }`. Relative string patterns
 * require a base URL and will throw.
 *
 * Requires `urlpattern-polyfill` for Safari < 26 and Firefox < 142.
 */
export function match(
  input: URLPatternInput,
  options?: URLPatternOptions,
): Computed<URLPatternResult | null> {
  const pattern = options
    ? new URLPattern(input, options)
    : new URLPattern(input);
  return computed(() => pattern.exec(currentLocation.href()));
}
