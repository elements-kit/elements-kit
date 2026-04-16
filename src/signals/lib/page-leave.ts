import { createEventListener } from "./event-listener.ts";

/**
 * Fires `handler` when the mouse cursor leaves the browser viewport
 * (detected via `mouseleave` on the document).
 */
export function createPageLeave(handler: () => void): Disposable {
  const cleanup = createEventListener(document, "mouseleave", handler);
  return { [Symbol.dispose]: cleanup };
}
