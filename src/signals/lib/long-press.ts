import { createEventListener } from "./event-listener.ts";

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
  const el = target;

  let timer: ReturnType<typeof setTimeout>;

  const onPointerDown = (e: Event) => {
    timer = setTimeout(() => handler(e as PointerEvent), delay);
  };

  const cancel = () => clearTimeout(timer);

  const cleanups: Array<() => void> = [];
  if (el) {
    cleanups.push(createEventListener(el, "pointerdown", onPointerDown));
    cleanups.push(createEventListener(el, "pointerup", cancel));
    cleanups.push(createEventListener(el, "pointerleave", cancel));
    cleanups.push(createEventListener(el, "pointermove", cancel));
  }
  const cleanup = () => {
    clearTimeout(timer);
    cleanups.forEach((fn) => fn());
  };

  return cleanup;
}
