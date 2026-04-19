/** `true` when running in a browser (both `window` and `document` exist). */
export const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

/** A shared `Disposable` whose `Symbol.dispose` is a no-op — useful as a safe default. */
export const noopDisposable: Disposable = {
  [Symbol.dispose]() {},
};
