import { on } from "./event-listener.ts";
import { createTimeout } from "@/utilities/timeout.ts";

/**
 * Fires `handler` when a pointer is held over `target` for at least `delay`
 * milliseconds (default: 500 ms).
 */
export function createLongPress(
  target: Element,
  handler: (e: PointerEvent) => void,
  options: { delay?: number } = {},
): () => void {
  const { delay = 500 } = options;
  let lastEvent: PointerEvent;
  const { reset, stop } = createTimeout(() => handler(lastEvent), delay, false);

  const cleanups = [
    on(target, "pointerdown", (e) => {
      lastEvent = e as PointerEvent;
      reset();
    }),
    on(target, "pointerup", stop),
    on(target, "pointerleave", stop),
    on(target, "pointermove", stop),
  ];

  return () => {
    stop();
    cleanups.forEach((fn) => fn());
  };
}
