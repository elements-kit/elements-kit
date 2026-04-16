import { type Computed, signal } from "../index.ts";
import { createResizeObserver } from "./resize-observer.ts";

type RectResult = {
  x: Computed<number>;
  y: Computed<number>;
  width: Computed<number>;
  height: Computed<number>;
  top: Computed<number>;
  right: Computed<number>;
  bottom: Computed<number>;
  left: Computed<number>;
} & Disposable;

/**
 * Observes the full bounding rect of `target` using a `ResizeObserver` (which
 * fires on size changes) and returns all eight DOMRect properties as reactive
 * computeds.
 */
export function createElementRect(
  target: Element | (() => Element | null),
): RectResult {
  const x = signal(0);
  const y = signal(0);
  const width = signal(0);
  const height = signal(0);
  const top = signal(0);
  const right = signal(0);
  const bottom = signal(0);
  const left = signal(0);

  const updateRect = (el: Element) => {
    const rect = el.getBoundingClientRect();
    x(rect.x);
    y(rect.y);
    width(rect.width);
    height(rect.height);
    top(rect.top);
    right(rect.right);
    bottom(rect.bottom);
    left(rect.left);
  };

  const observer = createResizeObserver(target, (entries) => {
    for (const entry of entries) {
      updateRect(entry.target as Element);
    }
  });

  const el = typeof target === "function" ? target() : target;
  if (el) updateRect(el);

  return Object.assign(
    {
      x: x as Computed<number>,
      y: y as Computed<number>,
      width: width as Computed<number>,
      height: height as Computed<number>,
      top: top as Computed<number>,
      right: right as Computed<number>,
      bottom: bottom as Computed<number>,
      left: left as Computed<number>,
    },
    { [Symbol.dispose]: observer[Symbol.dispose] },
  );
}
