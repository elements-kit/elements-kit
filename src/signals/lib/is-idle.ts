import { type Computed, onCleanup, signal } from "../index.ts";

/** Default idle timeout in milliseconds (60 seconds). */
const DEFAULT_TIMEOUT = 60_000;

/** Events that reset the idle timer. */
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "pointermove",
] as const;

/**
 * Returns a `Computed<boolean>` that is `true` when the user has been inactive
 * for longer than `timeout` milliseconds (default 60 s).
 */
export function createIsIdle(
  timeout = DEFAULT_TIMEOUT,
): Computed<boolean> & Disposable {
  const idle = signal(false);

  let timer: ReturnType<typeof setTimeout>;

  const reset = () => {
    clearTimeout(timer);
    idle(false);
    timer = setTimeout(() => idle(true), timeout);
  };

  reset();

  for (const event of ACTIVITY_EVENTS) {
    window.addEventListener(event, reset, { passive: true });
  }

  const cleanup = () => {
    clearTimeout(timer);
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, reset);
    }
  };
  onCleanup(cleanup);

  return Object.assign(idle as Computed<boolean>, {
    [Symbol.dispose]: cleanup,
  });
}
