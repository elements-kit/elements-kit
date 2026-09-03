/** A pure display-time shaper: raw scalar → constrained scalar. */
export type Modifier = (value: number) => number;

// ── rubber ──────────────────────────────────────────────────────────────

/** iOS rubber-band curve: sub-linear overshoot, asymptotes to
 * `dimension * constant` — pull but never escape. */
function resist(overshoot: number, dimension: number, constant: number): number {
  return (
    (overshoot * dimension * constant) / (dimension + constant * overshoot)
  );
}

/** Elastic resistance past `[min, max]`. The true value stays in `Motion`, so
 * release settles back cleanly. `dimension` = axis extent; `constant` = iOS
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
