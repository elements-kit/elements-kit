/**
 * Resize strategies — pluggable policy for a resize drag's live bounds
 * and resting size. Pure (no DOM); the gesture injects the context.
 * Built-in: `freeResize` (default). `detents()` (detents.ts) quantizes a
 * constraint region and doubles as a strategy.
 */

/** How far (ms) a release velocity is projected when picking a rest. */
export const PROJECTION_MS = 160;

/** Clamp `value` into `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The release context a `ResizeStrategy` decides against. The gesture
 * builds it per drag; `resolve` turns a step value into pixels.
 */
export interface ResizeContext {
  /** Dragged size along the axis (px, before clamping). */
  size: number;
  /** Size at the gesture's start (px). */
  startSize: number;
  /** Release velocity along the axis (px/ms; positive = shrinking). */
  velocity: number;
  /** Resize axis. */
  axis: "width" | "height";
  /** Hard room the surface may occupy on the axis (px). */
  min: number;
  max: number;
  /** Whether a drag/flick past the minimum may dismiss. */
  dismissible: boolean;
  /** Release velocity (px/ms) past which a sub-minimum release dismisses. */
  velocityThreshold: number;
  /** Resolves a step to px — a number is a fraction of the constraint
   * along the axis; a string is any CSS length. */
  resolve(value: number | string): number;
}

/**
 * Decides where a resize drag rests. The gesture calls `bounds()` for the
 * live rubber-band and `rest()` on release (the resting size, or `null`
 * to dismiss). Built-ins: `freeResize` (default), `detents`.
 */
export interface ResizeStrategy {
  /** Soft `[lo, hi]` bounds for the live drag — rubber-band past these.
   * Defaults to the hard room when omitted. */
  bounds?(ctx: ResizeContext): [number, number];
  /** Resting size (px) on release, or `null` to dismiss. */
  rest(ctx: ResizeContext): number | null;
}

/**
 * Picks the index of the detent closest to the released size, projected
 * along the release velocity (px/ms, positive = shrinking). Returns `-1`
 * when the gesture should dismiss instead.
 */
export function closestDetent(
  sizePx: number,
  detentsPx: readonly number[],
  velocityPxPerMs = 0,
  dismissible = false,
  velocityThreshold = 0.5,
): number {
  const projected = sizePx - velocityPxPerMs * PROJECTION_MS;
  if (dismissible) {
    const smallest = detentsPx[0] ?? 0;
    if (projected < smallest / 2) return -1;
    if (sizePx < smallest && velocityPxPerMs > velocityThreshold) return -1;
  }
  let best = 0;
  for (let i = 1; i < detentsPx.length; i++) {
    if (
      Math.abs(detentsPx[i] - projected) < Math.abs(detentsPx[best] - projected)
    ) {
      best = i;
    }
  }
  return best;
}

/**
 * Free resize: drag to any size within the room; a flick or shrink past
 * the minimum dismisses. The default strategy.
 */
export function freeResize(opts?: { min?: number }): ResizeStrategy {
  return {
    bounds: (ctx) => [opts?.min ?? ctx.min, ctx.max],
    rest: (ctx) => {
      const lo = opts?.min ?? ctx.min;
      const projected = ctx.size - ctx.velocity * PROJECTION_MS;
      if (
        ctx.dismissible &&
        (projected < lo / 2 ||
          (ctx.size < lo && ctx.velocity > ctx.velocityThreshold))
      ) {
        return null;
      }
      return clamp(ctx.size, lo, ctx.max);
    },
  };
}
