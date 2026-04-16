import { type Computed, onCleanup, signal } from "../index.ts";

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

  document.addEventListener("mousemove", handler);
  const cleanup = () => document.removeEventListener("mousemove", handler);
  onCleanup(cleanup);

  return Object.assign(
    { x: x as Computed<number>, y: y as Computed<number> },
    { [Symbol.dispose]: cleanup },
  );
}
