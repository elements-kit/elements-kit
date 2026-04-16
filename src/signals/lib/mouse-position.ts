import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

type MousePositionResult = {
  x: Computed<number>;
  y: Computed<number>;
} & Disposable;

/**
 * Returns reactive `x` / `y` signals that track the mouse pointer position on
 * the document.
 */
export function createMousePosition(): MousePositionResult {
  const x = signal(0);
  const y = signal(0);

  const handler = (e: MouseEvent) => {
    x(e.clientX);
    y(e.clientY);
  };

  const cleanup = createEventListener(document, "mousemove", handler);

  return Object.assign(
    { x: x as Computed<number>, y: y as Computed<number> },
    { [Symbol.dispose]: cleanup },
  );
}
