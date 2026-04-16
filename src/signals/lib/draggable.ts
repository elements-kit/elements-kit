import { type Computed, onCleanup, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

type DraggableResult = {
  /** Current x offset from the starting position. */
  x: Computed<number>;
  /** Current y offset from the starting position. */
  y: Computed<number>;
  /** `true` while the element is being dragged. */
  isDragging: Computed<boolean>;
} & Disposable;

/**
 * Makes `target` draggable via pointer events.  Returns reactive signals
 * for the drag offset and dragging state.
 */
export function createDraggable(
  target: HTMLElement | (() => HTMLElement | null),
): DraggableResult {
  const el = typeof target === "function" ? target() : target;
  const x = signal(0);
  const y = signal(0);
  const isDragging = signal(false);

  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;

  const onPointerMove = (e: PointerEvent) => {
    x(offsetX + e.clientX - startX);
    y(offsetY + e.clientY - startY);
  };

  const onPointerUp = () => {
    isDragging(false);
    offsetX = x();
    offsetY = y();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  const cleanups: Array<() => void> = [];

  if (el) {
    cleanups.push(
      createEventListener(el, "pointerdown", (e: PointerEvent) => {
        e.preventDefault();
        isDragging(true);
        startX = e.clientX;
        startY = e.clientY;
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      }),
    );
  }

  const cleanup = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    cleanups.forEach((fn) => fn());
  };
  onCleanup(cleanup);

  return {
    x: x as Computed<number>,
    y: y as Computed<number>,
    isDragging: isDragging as Computed<boolean>,
    [Symbol.dispose]: cleanup,
  };
}
