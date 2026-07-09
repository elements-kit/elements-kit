import type { Axis } from "./box.ts";
import { clamp, closestDetent, resist, resolveStop } from "./gesture-model.ts";

/**
 * Edit physics — a STATELESS policy, reusable across edits and across
 * boxes (define one "feel", drive five sheets with it). The box owns
 * the edit's state (snapshot, velocity, active flag); the session only
 * answers two questions per axis:
 *
 *   during(value)          where does the live value render? (rubber)
 *   rest(value, velocity)  where does it land on release? (`null` =
 *                          the edit wanted out — a dismiss flick)
 *
 * `Session` is the base implementation — rubber past the bounds while
 * dragging, clamp into them at rest. `SnapSession` snaps to detent
 * stops. Custom physics — magnetic edges, grids, whatever — subclass
 * and override the two hooks.
 */
export class Session {
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
 * const sheetFeel = new SnapSession([0.25, 0.6, 0.9]);
 * grip.onpointerdown = () => o.begin(sheetFeel);
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
