export const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

export const noopDisposable: Disposable = {
  [Symbol.dispose]() {},
};
