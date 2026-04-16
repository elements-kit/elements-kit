import { type Computed, onCleanup, signal } from "../index.ts";

/**
 * Returns a `Computed<boolean>` that tracks the Page Visibility API.
 * `true` while the document is visible; `false` when hidden (minimised,
 * background tab, etc.).
 */
export function createIsDocumentVisible(): Computed<boolean> & Disposable {
  const visible = signal(
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );

  const handler = () => {
    visible(document.visibilityState === "visible");
  };

  document.addEventListener("visibilitychange", handler);
  const cleanup = () =>
    document.removeEventListener("visibilitychange", handler);
  onCleanup(cleanup);

  return Object.assign(visible as Computed<boolean>, {
    [Symbol.dispose]: cleanup,
  });
}
