import { type Computed, onCleanup, signal } from "../index.ts";

type ScrollDirection = "left" | "right" | "none";
type VerticalDirection = "up" | "down" | "none";

type ScrollStateResult = {
  x: Computed<number>;
  y: Computed<number>;
  directionX: Computed<ScrollDirection>;
  directionY: Computed<VerticalDirection>;
} & Disposable;

function getScrollXY(target: Element | Window): { x: number; y: number } {
  if (target instanceof Window) {
    return { x: target.scrollX, y: target.scrollY };
  }
  return {
    x: (target as Element).scrollLeft,
    y: (target as Element).scrollTop,
  };
}

/**
 * Tracks the scroll position and scroll direction of `target` (defaults to
 * `window`).  Returns reactive computeds for `x`, `y`, `directionX`, and
 * `directionY`.
 */
export function createScrollState(
  target?: Element | Window | (() => Element | null),
): ScrollStateResult {
  const resolved =
    target === undefined
      ? window
      : typeof target === "function"
        ? (target() ?? window)
        : target;

  const initial = getScrollXY(resolved);
  const x = signal(initial.x);
  const y = signal(initial.y);
  const directionX = signal<ScrollDirection>("none");
  const directionY = signal<VerticalDirection>("none");

  let prevX = initial.x;
  let prevY = initial.y;

  const handler = () => {
    const pos = getScrollXY(resolved);
    directionX(pos.x > prevX ? "right" : pos.x < prevX ? "left" : "none");
    directionY(pos.y > prevY ? "down" : pos.y < prevY ? "up" : "none");
    prevX = pos.x;
    prevY = pos.y;
    x(pos.x);
    y(pos.y);
  };

  resolved.addEventListener("scroll", handler);
  const cleanup = () => resolved.removeEventListener("scroll", handler);
  onCleanup(cleanup);

  return Object.assign(
    {
      x: x as Computed<number>,
      y: y as Computed<number>,
      directionX: directionX as Computed<ScrollDirection>,
      directionY: directionY as Computed<VerticalDirection>,
    },
    { [Symbol.dispose]: cleanup },
  );
}
