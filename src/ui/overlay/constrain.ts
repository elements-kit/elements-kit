import { effect, onCleanup } from "@/signals/index.ts";
import { createElementRect } from "@/utilities/element-rect.ts";

/**
 * The overlay constraint — the rect an `.x-overlay` lives in.
 *
 * Every placement, detent, and clamp in overlay.css derives from the
 * `--overlay-constraint-top/-left/-width/-height` variables (declared
 * with viewport defaults in constraint.css): a placement is a degenerate
 * constraint, detents are fractions of it, and the center window's
 * move/resize bounds are the rect itself. This module is the JS side of
 * that interface — syncing a container's rect into the variables and
 * resolving them to pixels for the gesture bounds.
 */

export interface OverlayConstraint {
  dispose(): void;
  [Symbol.dispose](): void;
}

/**
 * Resolves a custom property holding a length to pixels. Plain `px`
 * values (written by `constrainOverlay` or by hand) parse directly;
 * anything else (`svh` / `calc()` / fractions of the constraint) resolves
 * natively by measuring a hidden probe.
 */
export function resolveVarPx(
  overlay: HTMLElement,
  name: string,
  axis: "height" | "width",
): number {
  const raw = getComputedStyle(overlay).getPropertyValue(name).trim();
  if (/^-?\d+(\.\d+)?px$/.test(raw)) return parseFloat(raw);
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style[axis] = `var(${name})`;
  overlay.appendChild(probe);
  const px = probe.getBoundingClientRect()[axis];
  probe.remove();
  return px;
}

/**
 * Resolves the constraint rect every gesture bound derives from — the
 * same four `--overlay-constraint-*` variables the stylesheet computes
 * against.
 */
export function resolveConstraint(overlay: HTMLElement): {
  top: number;
  left: number;
  width: number;
  height: number;
} {
  return {
    top: resolveVarPx(overlay, "--overlay-constraint-top", "height"),
    left: resolveVarPx(overlay, "--overlay-constraint-left", "width"),
    width: resolveVarPx(overlay, "--overlay-constraint-width", "width"),
    height: resolveVarPx(overlay, "--overlay-constraint-height", "height"),
  };
}

/**
 * Confines an overlay to a container element by syncing the container's
 * bounding rect into the `--overlay-constraint-*` variables (observed via
 * `ResizeObserver` through `createElementRect`). Every placement, detent,
 * clamp, and gesture bound derives from those variables, so the overlay
 * pins to the container's edges and re-clamps when it resizes.
 *
 * Caveat: `ResizeObserver` fires on size changes — a container that moves
 * without resizing (e.g. page scroll) does not retrigger the sync.
 *
 * Registers its cleanup with the current scope (`onCleanup`) and also
 * returns it as `dispose` / `Symbol.dispose`; disposing removes the
 * variables, restoring the viewport constraint.
 *
 * @example
 * ```ts
 * import { constrainOverlay } from "elements-kit/ui/overlay/constrain";
 *
 * const panel = document.querySelector("dialog.x-overlay")!;
 * constrainOverlay(panel, document.querySelector("main")!);
 * ```
 */
export function constrainOverlay(
  overlay: HTMLElement,
  container: Element,
): OverlayConstraint {
  const rect = createElementRect(container);
  const stop = effect(() => {
    overlay.style.setProperty("--overlay-constraint-top", `${rect.top()}px`);
    overlay.style.setProperty("--overlay-constraint-left", `${rect.left()}px`);
    overlay.style.setProperty(
      "--overlay-constraint-width",
      `${rect.width()}px`,
    );
    overlay.style.setProperty(
      "--overlay-constraint-height",
      `${rect.height()}px`,
    );
  });

  const dispose = () => {
    stop();
    rect[Symbol.dispose]();
    overlay.style.removeProperty("--overlay-constraint-top");
    overlay.style.removeProperty("--overlay-constraint-left");
    overlay.style.removeProperty("--overlay-constraint-width");
    overlay.style.removeProperty("--overlay-constraint-height");
  };
  onCleanup(dispose);

  return { dispose, [Symbol.dispose]: dispose };
}
