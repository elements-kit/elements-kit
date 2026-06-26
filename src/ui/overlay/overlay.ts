import { onCleanup } from "@/signals/index.ts";
import {
  type ConstraintRect,
  constrainOverlay,
  type OverlayConstraint,
} from "./constrain.ts";
import {
  createOverlayGestures,
  type OverlayGestureOptions,
} from "./gestures.ts";

export interface OverlayConfig extends OverlayGestureOptions {
  /** Confine the overlay to an element's rect (or a custom
   * {@link ConstraintRect}). Omit for the default viewport constraint. */
  constrain?: Element | ConstraintRect;
}

export interface OverlayController {
  /** Resize to a size (px) along the resize axis — animated by CSS. */
  resize(size: number): void;
  dispose(): void;
  [Symbol.dispose](): void;
}

/**
 * One-call wiring for an interactive `.x-overlay`: optional constraint
 * sync + pointer gestures, under a single disposable. Structure stays in
 * markup (`data-resize` / `data-draggable`); policy is config.
 *
 * Registers its cleanup with the current scope (`onCleanup`) and also
 * returns it as `dispose` / `Symbol.dispose`.
 *
 * @example
 * ```ts
 * import { overlay, detents } from "elements-kit/ui/overlay";
 *
 * const el = document.querySelector("dialog.x-overlay")!;
 * const o = overlay(el, {
 *   constrain: document.querySelector("main")!,
 *   resize: detents([0.25, 0.6, 0.9]),
 *   onResize: (size) => console.log(size),
 * });
 * ```
 */
export function overlay(
  el: HTMLElement,
  config?: OverlayConfig,
): OverlayController {
  const { constrain, ...gestureOptions } = config ?? {};

  let constraint: OverlayConstraint | null = null;
  if (constrain) constraint = constrainOverlay(el, constrain);

  const gestures = createOverlayGestures(el, gestureOptions);

  const dispose = () => {
    gestures.dispose();
    constraint?.dispose();
  };
  onCleanup(dispose);

  return {
    resize: (size) => gestures.resize(size),
    dispose,
    [Symbol.dispose]: dispose,
  };
}
