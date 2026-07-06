import { effect, onCleanup } from "@/signals/index.ts";
import { createElementRect } from "@/utilities/element-rect.ts";

/**
 * The constraint — one of the two spatial primitives (with the anchor).
 * A `Region` is a reactive rect; `constraint()` builds one from an
 * element, a plain rect, or nothing (the live viewport). `confine()`
 * applies a region to an overlay by syncing it into the
 * `--overlay-constraint-top/-left/-width/-height` channels every location
 * clamp and gesture bound derives from (declared in index.css with
 * viewport defaults). Derived values build on regions — `detents()`
 * quantizes one, `rubber()` resists at its edges.
 */

/** A reactive rect — the shape `createElementRect` returns, so an
 * `Element` works directly and custom rects (a static region, a virtual
 * area) can be supplied too. */
export interface Region {
  top(): number;
  left(): number;
  width(): number;
  height(): number;
}

/** A plain rect a `Region` can be built from. */
export interface RectInit {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Builds a {@link Region}: from an `Element` (observed via
 * `ResizeObserver` through `createElementRect`; cleanup routes through
 * the current scope), from a plain rect (static), or with no argument —
 * the live viewport (read at call time, not observed).
 */
export function constraint(source?: Element | RectInit): Region {
  if (source === undefined) {
    return {
      top: () => 0,
      left: () => 0,
      width: () => window.innerWidth,
      height: () => window.innerHeight,
    };
  }
  if (source instanceof Element) {
    const rect = createElementRect(source);
    onCleanup(() => rect[Symbol.dispose]());
    return rect;
  }
  return {
    top: () => source.top,
    left: () => source.left,
    width: () => source.width,
    height: () => source.height,
  };
}

export interface OverlayConstraint {
  dispose(): void;
  [Symbol.dispose](): void;
}

/**
 * Resolves a custom property holding a length to pixels. Plain `px` values
 * parse directly; anything else (`svh` / `calc()` / fractions of the
 * constraint) resolves natively by measuring a hidden probe. `fallback` is
 * a CSS length expression used when the property is unset.
 */
export function resolveVarPx(
  overlay: HTMLElement,
  name: string,
  axis: "height" | "width",
  fallback?: string,
): number {
  const raw = getComputedStyle(overlay).getPropertyValue(name).trim();
  if (/^-?\d+(\.\d+)?px$/.test(raw)) return parseFloat(raw);
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style[axis] = fallback ? `var(${name}, ${fallback})` : `var(${name})`;
  overlay.appendChild(probe);
  const px = probe.getBoundingClientRect()[axis];
  probe.remove();
  return px;
}

/** Resolves the constraint rect every gesture bound derives from. */
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
 * Confines an overlay to a {@link Region} by syncing it into the
 * `--overlay-constraint-*` variables. Every location clamp and gesture
 * bound derives from those variables, so the overlay re-clamps when the
 * region changes.
 *
 * Caveat: an element region observes size changes (`ResizeObserver`) — a
 * container that moves without resizing (e.g. page scroll) does not
 * retrigger the sync.
 *
 * Registers its cleanup with the current scope (`onCleanup`) and also
 * returns it as `dispose` / `Symbol.dispose`; disposing removes the
 * variables, restoring the viewport constraint.
 *
 * @example
 * ```ts
 * import { constraint, confine } from "elements-kit/ui/overlay";
 *
 * const panel = document.querySelector("dialog.x-overlay")!;
 * confine(panel, constraint(document.querySelector("main")!));
 * ```
 */
export function confine(
  overlay: HTMLElement,
  region: Region,
): OverlayConstraint {
  const stop = effect(() => {
    overlay.style.setProperty("--overlay-constraint-top", `${region.top()}px`);
    overlay.style.setProperty(
      "--overlay-constraint-left",
      `${region.left()}px`,
    );
    overlay.style.setProperty(
      "--overlay-constraint-width",
      `${region.width()}px`,
    );
    overlay.style.setProperty(
      "--overlay-constraint-height",
      `${region.height()}px`,
    );
  });

  const dispose = () => {
    stop();
    overlay.style.removeProperty("--overlay-constraint-top");
    overlay.style.removeProperty("--overlay-constraint-left");
    overlay.style.removeProperty("--overlay-constraint-width");
    overlay.style.removeProperty("--overlay-constraint-height");
  };
  onCleanup(dispose);

  return { dispose, [Symbol.dispose]: dispose };
}
