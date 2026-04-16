import { onCleanup } from "../index.ts";

const TYPING_KEYS = new Set([
  "Meta",
  "Alt",
  "Control",
  "Shift",
  "CapsLock",
  "Tab",
]);

/**
 * Fires `handler` once whenever the user starts typing (presses a non-modifier
 * key on the document).  The handler is not called again until the user stops
 * typing and then starts again (debounced by a 1 s idle window).
 */
export function createStartTyping(
  handler: () => void,
  idleMs = 1_000,
): Disposable {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let isTyping = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (TYPING_KEYS.has(e.key)) return;
    if (!isTyping) {
      isTyping = true;
      handler();
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      isTyping = false;
    }, idleMs);
  };

  document.addEventListener("keydown", onKeyDown);

  const cleanup = () => {
    clearTimeout(timer);
    document.removeEventListener("keydown", onKeyDown);
  };
  onCleanup(cleanup);

  return { [Symbol.dispose]: cleanup };
}
