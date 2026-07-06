import { resist } from "./gesture-model.ts";

/**
 * Effects — composable physics for motion through a space. Services
 * (`draggable`, `resize`) run each axis value through the effect chain:
 * `during` on every move, `settle` on release (`null` = dismiss signal).
 * `rubber()` is the built-in; custom effects are just objects.
 */
export interface Effect {
  /** Transform a live value (px on one axis) against the axis bounds. */
  during?(value: number, bounds: readonly [number, number]): number;
  /** Pick the resting value on release, or `null` to signal dismissal. */
  settle?(
    value: number,
    velocity: number,
    bounds: readonly [number, number],
  ): number | null;
}

/**
 * Edge resistance — values past the bounds move at a fraction of the
 * pointer (the iOS rubber band). Pure `resist()` under the hood; no
 * channels involved, so it applies to anything a service moves.
 */
export function rubber(): Effect {
  return {
    during: (value, [lo, hi]) => resist(value, lo, hi),
  };
}
