import { onCleanup } from "../index.ts";

/**
 * Registers a `beforeunload` handler that shows a native confirmation dialog
 * when the user tries to leave the page.
 *
 * `message` can be a string or a reactive getter (re-evaluated on each event).
 * Modern browsers ignore custom messages and show a generic prompt instead.
 */
export function createBeforeUnload(
  message?: string | (() => string),
): Disposable {
  const handler = (e: BeforeUnloadEvent) => {
    const msg = typeof message === "function" ? message() : message;
    e.preventDefault();
    if (msg !== undefined) e.returnValue = msg;
  };

  window.addEventListener("beforeunload", handler);
  const cleanup = () => window.removeEventListener("beforeunload", handler);
  onCleanup(cleanup);

  return { [Symbol.dispose]: cleanup };
}
