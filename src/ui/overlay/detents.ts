import type { Region } from "./constraint.ts";
import {
  clamp,
  closestDetent,
  type ResizeContext,
  type ResizeStrategy,
} from "./resize-strategy.ts";

/**
 * Detents — a customization of the constraint: the region, quantized.
 * One snapping concept for both services: `resize()` (and the markup
 * gestures) snap extents to the stops; `draggable()` snaps positions to
 * them. A bottom sheet's size detents and its top-edge position detents
 * were always the same thing — here they are literally the same object.
 */

/** A {@link Region} with quantized stops. Doubles as a `ResizeStrategy`
 * (the stops resolve per axis through the gesture's `ResizeContext`). */
export interface Space extends ResizeStrategy {
  readonly region: Region;
  readonly stops: readonly (number | string)[];
  /** The numeric stops resolved against a region axis (px, sorted) —
   * position snapping for `draggable()`. String stops (CSS lengths) need
   * an element context and only apply to resizes. */
  positions(axis: "width" | "height"): number[];
}

/**
 * Quantizes a region: each stop is a fraction of the region along the
 * axis (number `0–1`) or a CSS length (string, resize-only). Flick-aware
 * on release; shrinking past the smallest stop dismisses (when the
 * consumer allows dismissal).
 *
 * @example
 * ```ts
 * import { constraint, detents } from "elements-kit/ui/overlay";
 *
 * const d = detents(constraint(), [0.25, 0.6, 0.9]); // of the viewport
 * ```
 */
export function detents(
  region: Region,
  stops: readonly (number | string)[],
): Space {
  const resolved = (ctx: ResizeContext) =>
    stops
      .map((s) => clamp(ctx.resolve(s), ctx.min, ctx.max))
      .sort((a, b) => a - b);
  return {
    region,
    stops,
    positions(axis) {
      const size = axis === "width" ? region.width() : region.height();
      return stops
        .filter((s): s is number => typeof s === "number")
        .map((s) => s * size)
        .sort((a, b) => a - b);
    },
    bounds(ctx) {
      const s = resolved(ctx);
      return [s[0] ?? ctx.min, s[s.length - 1] ?? ctx.max];
    },
    rest(ctx) {
      const s = resolved(ctx);
      const i = closestDetent(
        ctx.size,
        s,
        ctx.velocity,
        ctx.dismissible,
        ctx.velocityThreshold,
      );
      return i === -1 ? null : s[i];
    },
  };
}
