import { onCleanup } from "../index.ts";

/**
 * Fires `handler` when the mouse cursor leaves the browser viewport
 * (detected via `mouseleave` on the document).
 */
export function createPageLeave(handler: () => void): Disposable {
  document.addEventListener("mouseleave", handler);
  const cleanup = () => document.removeEventListener("mouseleave", handler);
  onCleanup(cleanup);
  return { [Symbol.dispose]: cleanup };
}
