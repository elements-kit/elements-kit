/** `true` when running in a browser (both `window` and `document` exist). */
export const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

/**
 * `HTMLElement` in the browser; an empty stand-in on the server.
 *
 * A custom-element class evaluates its `extends` clause at module load, but
 * `HTMLElement` is undefined in Node — so importing an element module during
 * SSR (e.g. an Astro `client:load` island) throws `HTMLElement is not defined`
 * before any `isBrowser` guard can run. Elements are never *constructed* on the
 * server (the streaming renderer emits plain tags), so a stub base is enough to
 * let the class definition load; the guarded `customElements.define` still only
 * registers in a real browser.
 */
export const HTMLElementBase: typeof HTMLElement = isBrowser
  ? HTMLElement
  : (class {} as unknown as typeof HTMLElement);

/** A shared `Disposable` whose `Symbol.dispose` is a no-op — useful as a safe default. */
export const noopDisposable: Disposable = {
  [Symbol.dispose]() {},
};
