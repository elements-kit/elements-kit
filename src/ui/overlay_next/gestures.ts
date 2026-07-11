/**
 * Gesture modifiers over `Motion` — the layer between raw physics
 * (value/velocity/displacement) and the box renderer. Pure number math, no DOM.
 *
 * - Pure shapers (`rubber`, `detent`): stateless, run in the projection.
 * - The settle (`snap` + `spring`): the one time-driven piece.
 *
 * `apply` isn't here — it's the box's geometry fold. Gestures decide the delta;
 * the box commits it. Velocities are `Motion`'s px/ms throughout.
 */

/** A pure display-time shaper: raw scalar → constrained scalar. */
export type Modifier = (value: number) => number;

/** Left-to-right: `compose(a, b)(x)` = `b(a(x))`. */
export function compose(...mods: Modifier[]): Modifier {
  return (x) => mods.reduce((v, mod) => mod(v), x);
}

// ── rubber ──────────────────────────────────────────────────────────────

/** iOS rubber-band curve: sub-linear overshoot, asymptotes to
 * `dimension * constant` — pull but never escape. */
function resist(
  overshoot: number,
  dimension: number,
  constant: number,
): number {
  return (
    (overshoot * dimension * constant) / (dimension + constant * overshoot)
  );
}

/** Elastic resistance past `[min, max]`. The true value stays in `Motion`, so
 * release springs back cleanly. `dimension` = axis extent; `constant` = iOS
 * tension (higher = looser). */
export function rubber(
  min: number,
  max: number,
  dimension: number,
  constant = 0.55,
): Modifier {
  return (x) =>
    x < min
      ? min - resist(min - x, dimension, constant)
      : x > max
        ? max + resist(x - max, dimension, constant)
        : x;
}

// ── detents ─────────────────────────────────────────────────────────────

/** The nearest detent to `value`. */
export function nearest(value: number, points: number[]): number {
  return points.reduce((a, b) =>
    Math.abs(b - value) < Math.abs(a - value) ? b : a,
  );
}

/** Magnetic pull toward the nearest detent during a drag (0 = free, 1 = snap). */
export function detent(points: number[], strength = 0): Modifier {
  return (x) => x + (nearest(x, points) - x) * strength;
}

/** Release target: project by velocity (`reach` ms of carry), then nearest detent. */
export function snap(
  value: number,
  velocity: number,
  points: number[],
  reach = 150,
): number {
  return nearest(value + velocity * reach, points);
}

// ── resize handles ──────────────────────────────────────────────────────

/** How a resize handle maps the pointer delta onto a box's channels:
 * `x`/`y` move the origin (the edges that follow the pointer), `w`/`h` resize.
 * Coefficients are −1 | 0 | 1 on the pointer's (dx, dy). */
export interface Handle {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
  w: -1 | 0 | 1;
  h: -1 | 0 | 1;
}

/** The eight resize handles by compass point. A `top left` transform-origin
 * renders them all: a moving edge drives x/y so `translate` shifts the origin,
 * and `scale` grows from it to the fixed edge. */
export const HANDLES = {
  e: { x: 0, y: 0, w: 1, h: 0 },
  w: { x: 1, y: 0, w: -1, h: 0 },
  s: { x: 0, y: 0, w: 0, h: 1 },
  n: { x: 0, y: 1, w: 0, h: -1 },
  se: { x: 0, y: 0, w: 1, h: 1 },
  sw: { x: 1, y: 0, w: -1, h: 1 },
  ne: { x: 0, y: 1, w: 1, h: -1 },
  nw: { x: 1, y: 1, w: -1, h: -1 },
} satisfies Record<string, Handle>;

// ── the settle ──────────────────────────────────────────────────────────

export interface SpringOptions {
  /** Higher = snappier. */
  stiffness?: number;
  /** Higher = settles sooner, less overshoot. */
  damping?: number;
  /** Initial velocity in px/ms (`Motion`'s unit). */
  velocity?: number;
  /** Rest threshold in px. */
  epsilon?: number;
}

/** Animate `from → to` on a spring: `onStep` each frame, `onSettle` at rest.
 * Returns `stop()`. The only stateful, time-driven piece — it owns the rAF loop. */
export function spring(
  from: number,
  to: number,
  onStep: (value: number) => void,
  {
    stiffness = 180,
    damping = 22,
    velocity = 0,
    epsilon = 0.1,
  }: SpringOptions = {},
  onSettle?: () => void,
): () => void {
  let x = from;
  let v = velocity * 1000; // px/ms → px/s for the integrator
  let last = performance.now();
  let frame = requestAnimationFrame(tick);

  function tick(now: number): void {
    const dt = Math.min((now - last) / 1000, 1 / 30); // clamp tab-stall spikes
    last = now;
    // Semi-implicit Euler: velocity from the restoring force, then position.
    v += (-stiffness * (x - to) - damping * v) * dt;
    x += v * dt;

    if (Math.abs(x - to) < epsilon && Math.abs(v) < epsilon) {
      onStep(to);
      onSettle?.();
      return;
    }
    onStep(x);
    frame = requestAnimationFrame(tick);
  }

  return () => cancelAnimationFrame(frame);
}
