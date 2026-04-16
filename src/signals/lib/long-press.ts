import { onCleanup } from "../index.ts";

/**
 * Fires `handler` when a pointer is held over `target` for at least `delay`
 * milliseconds (default: 500 ms).
 */
export function createLongPress(
  target: Element | (() => Element | null),
  handler: (e: PointerEvent) => void,
  options: { delay?: number } = {},
): Disposable {
  const { delay = 500 } = options;
  const el = typeof target === "function" ? target() : target;

  let timer: ReturnType<typeof setTimeout>;

  const onPointerDown = (e: PointerEvent) => {
    timer = setTimeout(() => handler(e), delay);
  };

  const cancel = () => clearTimeout(timer);

  if (el) {
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", cancel);
    el.addEventListener("pointerleave", cancel);
    el.addEventListener("pointermove", cancel);
  }

  const cleanup = () => {
    clearTimeout(timer);
    if (!el) return;
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointerup", cancel);
    el.removeEventListener("pointerleave", cancel);
    el.removeEventListener("pointermove", cancel);
  };
  onCleanup(cleanup);

  return { [Symbol.dispose]: cleanup };
}
