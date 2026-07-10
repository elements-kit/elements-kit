import type { Axis, PlainBox } from "./box.ts";

/**
 * A session IS one edit — a bounded episode over a box. Constructed
 * fresh per edit (they're free), handed to `begin()`, spent at
 * release/cancel; reusing a spent session throws. The session owns the
 * episode's state: the entry snapshot and per-axis velocity tracking.
 *
 * Subclasses define the edit's FEEL by overriding two hooks:
 *
 *   during(value)          where does the live value render? (rubber)
 *   rest(value, velocity)  where does it land on release? (`null` =
 *                          the edit wanted out — a dismiss flick)
 *
 * `Session` is the base feel — rubber past the bounds while dragging,
 * clamp into them at rest. `SnapSession` snaps to detent stops. Custom
 * feels — magnetic edges, grids, whatever — subclass and override the
 * two hooks. The episode plumbing (`start`/`track`/`end`/`abort`) is
 * driven by `Editable` and is not an override surface.
 *
 * The pure math below is the ONE physics implementation — the markup
 * gesture layer runs on the same functions.
 */

/** Rubber-band resistance past a bound. */
const RESISTANCE = 3;

/** How far (ms) a release velocity is projected when picking a rest. */
export const PROJECTION_MS = 160;

/** Clamp `value` into `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Clamp with rubber-band resistance past either bound. */
export function resist(
  value: number,
  min: number,
  max: number,
  resistance = RESISTANCE,
): number {
  if (value > max) return max + (value - max) / resistance;
  if (value < min) return min - (min - value) / resistance;
  return value;
}

/** Resolve a snap stop against an axis's bounds: a number is a fraction
 * of the span (anchored at the lower bound); a string is a px length. */
export function resolveStop(
  stop: number | string,
  bounds: readonly [number, number],
): number {
  if (typeof stop === "string") return parseFloat(stop);
  return bounds[0] + stop * (bounds[1] - bounds[0]);
}

/**
 * Picks the index of the detent closest to the released value, projected
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

/** Per-axis tracking of the episode. */
interface EditAxis {
  value: number;
  lastTime: number;
  velocity: number;
  driven: boolean;
}

export class Session {
  #snapshot: Required<PlainBox> | undefined;
  #axes: Partial<Record<Axis, EditAxis>> = {};
  #spent = false;

  /** Bind to an edit: record the entry snapshot. Driven by
   * `Editable.begin()`; throws on reuse — a session is one edit. */
  start(snapshot: Required<PlainBox>): void {
    if (this.#spent || this.#snapshot) {
      throw new Error("session already used — construct one per edit");
    }
    this.#snapshot = snapshot;
  }

  /** Velocity-track a driven axis and return its live (`during`) value.
   * Driven by `Editable.set()`. */
  track(axis: Axis, raw: number, bounds: readonly [number, number]): number {
    const now = performance.now();
    const prev = this.#axes[axis];
    const velocity =
      prev && now > prev.lastTime
        ? (raw - prev.value) / (now - prev.lastTime)
        : (prev?.velocity ?? 0);
    this.#axes[axis] = { value: raw, lastTime: now, velocity, driven: true };
    return this.during(raw, axis, bounds);
  }

  /** Rest every driven axis (velocity-projected via `rest`). Any axis
   * resting `null` means "should dismiss" — the whole edit rests `null`.
   * Spends the session. Driven by `Editable.release()`. */
  end(
    boundsFor: (axis: Axis) => readonly [number, number],
  ): Partial<PlainBox> | null {
    const rested: Partial<PlainBox> = {};
    for (const axis of Object.keys(this.#axes) as Axis[]) {
      const state = this.#axes[axis];
      if (!state?.driven) continue;
      const r = this.rest(state.value, state.velocity, axis, boundsFor(axis));
      if (r === null) return null;
      rested[axis] = r;
    }
    this.#spent = true;
    return rested;
  }

  /** Abort the edit: spend the session, hand back the entry snapshot
   * for the box to restore. Driven by `Editable.cancel()`. */
  abort(): Required<PlainBox> | undefined {
    const snapshot = this.#snapshot;
    this.#snapshot = undefined;
    this.#spent = true;
    return snapshot;
  }

  /** Soft range the live value moves in freely — rubber past it.
   * Subclasses narrow it (e.g. to the outermost stops). */
  protected bounds(
    bounds: readonly [number, number],
  ): readonly [number, number] {
    return bounds;
  }

  /** Live transform of a dragged value. */
  during(
    value: number,
    _axis: Axis,
    bounds: readonly [number, number],
  ): number {
    const [lo, hi] = this.bounds(bounds);
    return resist(value, lo, hi);
  }

  /** Resting value on release, velocity-projected (px/ms, positive =
   * increasing). `null` signals dismissal. */
  rest(
    value: number,
    _velocity: number,
    _axis: Axis,
    bounds: readonly [number, number],
  ): number | null {
    return clamp(value, bounds[0], bounds[1]);
  }
}

/**
 * Detent physics: the value rests on the nearest stop, velocity-
 * projected; a flick past the smallest stop rests `null` (the dismiss
 * signal). Stops are fractions of the axis bounds (number `0–1`) or px
 * lengths (string, `"320px"`).
 *
 * @example
 * ```ts
 * grip.onpointerdown = () => o.begin(new SnapSession([0.25, 0.6, 0.9]));
 * ```
 */
export class SnapSession extends Session {
  readonly #stops: readonly (number | string)[];

  constructor(stops: readonly (number | string)[]) {
    super();
    this.#stops = stops;
  }

  /** The resolved, sorted stops for one axis (px). */
  #resolved(bounds: readonly [number, number]): number[] {
    return this.#stops
      .map((s) => clamp(resolveStop(s, bounds), bounds[0], bounds[1]))
      .sort((a, b) => a - b);
  }

  protected override bounds(
    bounds: readonly [number, number],
  ): readonly [number, number] {
    const stops = this.#resolved(bounds);
    return stops.length ? [stops[0], stops[stops.length - 1]] : bounds;
  }

  override rest(
    value: number,
    velocity: number,
    _axis: Axis,
    bounds: readonly [number, number],
  ): number | null {
    const stops = this.#resolved(bounds);
    if (!stops.length) return super.rest(value, velocity, _axis, bounds);
    // closestDetent's velocity convention is positive = shrinking.
    const i = closestDetent(value, stops, -velocity, true, 0.5);
    return i === -1 ? null : stops[i];
  }
}
