import { effect, onCleanup } from "@/signals/index.ts";
import { createElementRect } from "@/utilities/element-rect.ts";

/**
 * The overlay constraint — the rect an `.x-overlay` lives in.
 *
 * Every location clamp, detent, and size cap in index.css derives from
 * the `--overlay-constraint-top/-left/-width/-height` variables
 * (declared there with viewport defaults): the `--overlay-x`/`-y`
 * location point clamps inside the rect, detents are fractions of it,
 * and the gesture bounds are the rect itself. This module is the JS
 * side of that interface — syncing a container's rect into the
 * variables and resolving them to pixels for the gesture bounds.
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
 * `ResizeObserver` through `createElementRect`). Every location clamp,
 * detent, and gesture bound derives from those variables, so the overlay
 * stays inside the container and re-clamps when it resizes.
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

/**
 * Opt-in pointer gestures for `.x-overlay`, dispatched by the two
 * gesture attributes:
 *
 * - An edge word (`block-start`/`block-end`/`inline-start`/`inline-end`)
 *   is a whole-surface detent drag along that axis: block words drag the
 *   height (sheets), inline words the width (drawers), direction-aware
 *   (`:dir(rtl)` flips the inline sign). The side names the handle; the
 *   opposite side stays put.
 * - A corner word (`start-start`/`start-end`/`end-start`/`end-end` —
 *   block side first, inline second) is a corner grip: a desktop-window
 *   resize engaging from a square zone at that corner, anchored at the
 *   opposite corner so the grip tracks the pointer 1:1 and the surface
 *   never grows past the constraint — the bounds rubber-band like
 *   everything else. The width follows the `resize` strategy (free by
 *   default; `detents([…])` snaps); the height is a free clamp. The size
 *   persists via the public `--overlay-w`/`--overlay-h` channels and the
 *   location point shifts by half the growth (pinning the anchor).
 *   Shrinking past the minimum dismisses.
 * - `data-draggable` moves the surface in x/y from the top strip,
 *   constrained to the rect with rubber-band resistance at the edges.
 *   The location persists across releases via the public
 *   `--overlay-x`/`--overlay-y` point (clamped by the stylesheet), and
 *   flinging the surface off the constraint — any side — closes it
 *   when `dismissible` (a slow over-drag springs back instead).
 *
 * Resize steps are a JS concern: the `resize` strategy (`freeResize` by
 * default, or `detents`) decides the rubber-band bounds and the resting
 * size, which the gesture writes to the size channels — CSS just renders
 * and animates them. While dragging, the size is driven inline with
 * transitions suppressed; below the lower bound the surface slides away
 * via the JS-owned `--overlay-dy` (or `--overlay-dx`) variable, which the
 * stylesheet composes into its `translate` — JS never touches `translate`
 * (or `top`/`left`) itself. On release the strategy resolves the resting
 * size (rubber-band overshoot springs back via the CSS transition) or
 * dismisses — `close()` for dialogs, `hidePopover()` otherwise.
 * Dismissing restores the channel values from the gesture's start, so a
 * closed overlay reopens where it was.
 *
 * The affordances (grabber pills, corner grip, move dot) are pure CSS,
 * shown whenever `data-resize` / `data-draggable` is set.
 *
 * Registers its cleanup with the current scope (`onCleanup`) and also
 * returns it as `dispose` / `Symbol.dispose`.
 *
 * @example
 * ```ts
 * import { createOverlayGestures, detents } from "elements-kit/ui/overlay";
 *
 * const overlay = document.querySelector("dialog.x-overlay")!;
 * const gestures = createOverlayGestures(overlay, {
 *   resize: detents([0.25, 0.6, 0.9]), // fractions of the constraint axis
 * });
 * overlay.addEventListener("resizechange", (e) => console.log(e.detail));
 * ```
 */

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
 * live rubber-band and `rest()` on release (returns the resting size, or
 * `null` to dismiss). Built-ins: `freeResize` (default), `detents`.
 */
export interface ResizeStrategy {
  /** Soft `[lo, hi]` bounds for the live drag — rubber-band past these.
   * Defaults to the hard room when omitted. */
  bounds?(ctx: ResizeContext): [number, number];
  /** Resting size (px) on release, or `null` to dismiss. */
  rest(ctx: ResizeContext): number | null;
}

export interface OverlayGestureOptions {
  /** How a resize drag rests. Default: `freeResize()`. */
  resize?: ResizeStrategy;
  /** Allow a drag/flick past the minimum to close. Default `true`. */
  dismissible?: boolean;
  /** Release velocity (px/ms, shrinking) that dismisses. Default `0.5`. */
  velocityThreshold?: number;
}

export interface OverlayGestures {
  /** Resize to a size (px) along the resize axis — animated by CSS. */
  resize(size: number): void;
  dispose(): void;
  [Symbol.dispose](): void;
}
/** How far (ms) a release velocity is projected when picking a detent. */
const PROJECTION_MS = 160;
/** Rubber-band resistance above the largest detent. */
const RESISTANCE = 3;
/** Corner grip: square engagement zone at the handle corner. */
const RESIZE_ZONE_PX = 28;
/** Draggable: top strip that engages the x/y move. */
const MOVE_ZONE_PX = 28;
/** Corner resize: minimum size (free mode). */
const MIN_RESIZE_W = 240;
const MIN_RESIZE_H = 160;

type Mode = "block" | "inline" | "resize" | "move";

/** Clamp with rubber-band resistance past either bound. */
function resist(value: number, min: number, max: number): number {
  if (value > max) return max + (value - max) / RESISTANCE;
  if (value < min) return min - (min - value) / RESISTANCE;
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The block / inline handle sides a `data-resize` value encodes. Edges
 * name one axis (`block-start`, `inline-end` → the other side `null`);
 * corners name both as a `start`/`end` pair, block side first
 * (`end-end`, `start-end`).
 */
function parseResize(resize: string): {
  block: "start" | "end" | null;
  inline: "start" | "end" | null;
} {
  const value = resize.trim();
  const corner = /^(start|end)-(start|end)$/.exec(value);
  if (corner) {
    return {
      block: corner[1] as "start" | "end",
      inline: corner[2] as "start" | "end",
    };
  }
  const block = /^block-(start|end)$/.exec(value);
  if (block) return { block: block[1] as "start" | "end", inline: null };
  const inline = /^inline-(start|end)$/.exec(value);
  if (inline) return { block: null, inline: inline[1] as "start" | "end" };
  return { block: null, inline: null };
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

/**
 * Snap to discrete steps — each a fraction of the constraint along the
 * axis (number `0–1`) or a CSS length (string). Flick-aware; shrinking
 * past the smallest step dismisses.
 */
export function detents(steps: readonly (number | string)[]): ResizeStrategy {
  const resolved = (ctx: ResizeContext) =>
    steps
      .map((s) => clamp(ctx.resolve(s), ctx.min, ctx.max))
      .sort((a, b) => a - b);
  return {
    bounds: (ctx) => {
      const s = resolved(ctx);
      return [s[0] ?? ctx.min, s[s.length - 1] ?? ctx.max];
    },
    rest: (ctx) => {
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

export function createOverlayGestures(
  overlay: HTMLElement,
  options?: OverlayGestureOptions,
): OverlayGestures {
  const strategy = options?.resize ?? freeResize();
  const dismissible = options?.dismissible ?? true;
  const velocityThreshold = options?.velocityThreshold ?? 0.5;

  const restoreChannel = (name: string, value: string) => {
    if (value) overlay.style.setProperty(name, value);
    else overlay.style.removeProperty(name);
  };

  /** Resolves a step value to px in the overlay's context. */
  const probeLength = (value: string, axis: "width" | "height"): number => {
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style[axis] = value;
    overlay.appendChild(probe);
    const px = probe.getBoundingClientRect()[axis];
    probe.remove();
    return px;
  };

  /** Builds the strategy context for the active resize axis. */
  const resizeCtx = (size: number, velocity: number): ResizeContext => ({
    size,
    startSize,
    velocity,
    axis: resizeAxis,
    min: hardMin,
    max: hardMax,
    dismissible,
    velocityThreshold,
    resolve: (value) =>
      typeof value === "number"
        ? value *
          (resizeAxis === "width" ? constraint.width : constraint.height)
        : probeLength(value, resizeAxis),
  });

  /** Notifies listeners of the rested size along the resize axis. */
  const emitResize = () => {
    overlay.dispatchEvent(
      new CustomEvent("resizechange", {
        bubbles: true,
        composed: true,
        detail: {
          width: overlay.style.getPropertyValue("--overlay-w") || undefined,
          height: overlay.style.getPropertyValue("--overlay-h") || undefined,
        },
      }),
    );
  };

  const clearDrag = () => {
    overlay.style.removeProperty("height");
    overlay.style.removeProperty("width");
    overlay.style.removeProperty("--overlay-dy");
    overlay.style.removeProperty("--overlay-dx");
    overlay.style.removeProperty("transition");
    overlay.style.removeProperty("user-select");
    overlay.style.removeProperty("-webkit-user-select");
  };

  /**
   * Detent resize: pin the handle-less edge by shifting the location
   * point half the size change (the frame is center-anchored). Skipped
   * when the sheet is docked — the CSS clamp already holds that edge.
   */
  const anchorEdgeLocation = (size: number) => {
    if (docked) return;
    if (mode === "inline") {
      overlay.style.setProperty(
        "--overlay-x",
        `${centerX0 - constraint.left + (signX * (size - startSize)) / 2}px`,
      );
    } else {
      overlay.style.setProperty(
        "--overlay-y",
        `${centerY0 - constraint.top + (signY * (size - startSize)) / 2}px`,
      );
    }
  };

  const dismiss = () => {
    clearDrag();
    // Revert just the dismissing gesture — restore the channels as they
    // were when it engaged (a prior persisted move/resize, or the
    // author's morph, survives; only this gesture's changes are undone).
    restoreChannel("--overlay-x", prev.x);
    restoreChannel("--overlay-y", prev.y);
    restoreChannel("--overlay-w", prev.w);
    restoreChannel("--overlay-h", prev.h);
    if (overlay instanceof HTMLDialogElement && overlay.open) {
      overlay.close();
    } else {
      (overlay as { hidePopover?: () => void }).hidePopover?.();
    }
  };

  let mode: Mode = "block";
  let startX = 0;
  let startY = 0;
  let startSize = 0;
  let startW = 0;
  let startH = 0;
  /** Channel values at engage — pointercancel restores these. */
  let prev = { x: "", y: "", w: "", h: "" };
  /** Rendered box center (viewport coords) at engage — the base every
   * move/resize delta composes onto, so prior gestures carry over. */
  let centerX0 = 0;
  let centerY0 = 0;
  /** Move bounds on the box center — the same clamp the stylesheet
   * applies to the persisted location point. */
  let moveMinX = 0;
  let moveMaxX = 0;
  let moveMinY = 0;
  let moveMaxY = 0;
  /** Resize bounds — the anchored corner pins the max to the constraint. */
  let maxW = 0;
  let maxH = 0;
  /** Constraint rect snapshot for the active gesture. */
  let constraint = { top: 0, left: 0, width: 0, height: 0 };
  /** Detent drag: +1 dragging toward the far edge grows the surface. */
  let sign = -1;
  /** Corner / detent resize: physical growth signs from the handle side. */
  let signX = 1;
  let signY = 1;
  /** Detent resize: the opposite edge already sits flush against the
   * constraint, so the CSS clamp anchors it — skip the location shift. */
  let docked = false;
  /** -1 in RTL — flips inline-axis pointer deltas. */
  let dir = 1;
  /** The axis the active resize strategy steps along. */
  let resizeAxis: "width" | "height" = "height";
  /** Soft rubber-band bounds (px) + hard room for the active resize. */
  let lo = 0;
  let hi = 0;
  let hardMin = 0;
  let hardMax = 0;
  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocityX = 0;
  let velocityY = 0;
  let dragging = false;

  const blockScroll = (event: TouchEvent) => {
    if (dragging) event.preventDefault();
  };

  /** The release velocity along the active drag axis (px/ms). */
  const axisVelocity = () => (mode === "block" ? velocityY : velocityX);

  const onPointerDown = (event: PointerEvent) => {
    const resize = overlay.getAttribute("data-resize") ?? "";
    const draggable = overlay.hasAttribute("data-draggable");
    if (!resize && !draggable) return;
    // data-anchor is reserved for future element anchoring — don't drag it.
    if (overlay.getAttribute("data-anchor") === "element") return;
    // Leave interactive elements alone — capturing the pointer would
    // retarget the pointerup to the overlay and swallow their click
    // (labels activate a wrapped control, e.g. `.x-toggle`).
    const target = event.target as Element | null;
    if (
      target?.closest(
        "button, a, label, input, select, textarea, [contenteditable]",
      )
    ) {
      return;
    }
    // Don't hijack a scroll-back gesture inside scrolled content.
    for (let el = target; el !== null && el !== overlay; el = el.parentElement) {
      if (el.scrollTop > 0) return;
    }

    dir = getComputedStyle(overlay).direction === "rtl" ? -1 : 1;
    const { block, inline } = parseResize(resize);
    const corner = block !== null && inline !== null;
    const rect = overlay.getBoundingClientRect();

    // Engagement priority: corner grip → move zone → whole-surface
    // detent drag (single word).
    const handleRight = (inline === "end") === (dir === 1);
    const inCorner =
      corner &&
      Math.abs(event.clientX - (handleRight ? rect.right : rect.left)) <=
        RESIZE_ZONE_PX &&
      Math.abs(
        event.clientY - (block === "end" ? rect.bottom : rect.top),
      ) <= RESIZE_ZONE_PX;
    // Move engages from the top strip — except a block-start sheet, whose
    // resize pill sits at top-center: there move engages only from the
    // top-start corner (its drag dot), leaving the pill free to resize.
    const topCenterResize = block === "start" && inline === null;
    const inMoveZone =
      draggable &&
      event.clientY - rect.top >= 0 &&
      event.clientY - rect.top <= MOVE_ZONE_PX &&
      (!topCenterResize ||
        Math.abs(event.clientX - (dir === 1 ? rect.left : rect.right)) <=
          MOVE_ZONE_PX);

    // Every engaged gesture composes onto the rendered center + the
    // constraint rect, and snapshots the channels so a dismiss/cancel
    // reverts just this gesture.
    constraint = resolveConstraint(overlay);
    centerX0 = rect.left + rect.width / 2;
    centerY0 = rect.top + rect.height / 2;
    prev = {
      x: overlay.style.getPropertyValue("--overlay-x"),
      y: overlay.style.getPropertyValue("--overlay-y"),
      w: overlay.style.getPropertyValue("--overlay-w"),
      h: overlay.style.getPropertyValue("--overlay-h"),
    };
    docked = false;

    if (inCorner) {
      mode = "resize";
      resizeAxis = "width";
      startW = rect.width;
      startH = rect.height;
      startSize = rect.width;
      signX = (inline === "end" ? 1 : -1) * dir;
      signY = block === "end" ? 1 : -1;
      // The opposite corner stays anchored, so the room toward the
      // handle-side constraint edges bounds the size — the grip never
      // leaves the constraint.
      maxW = handleRight
        ? constraint.left + constraint.width - rect.left
        : rect.right - constraint.left;
      maxH =
        block === "end"
          ? constraint.top + constraint.height - rect.top
          : rect.bottom - constraint.top;
      // The strategy snaps/bounds the width; the height stays free.
      hardMin = MIN_RESIZE_W;
      hardMax = maxW;
      [lo, hi] = strategy.bounds
        ? strategy.bounds(resizeCtx(startSize, 0))
        : [hardMin, hardMax];
    } else if (inMoveZone) {
      mode = "move";
      // Bounds on the box center — exactly the stylesheet's clamp, so
      // the persisted point and the gesture agree on the resting spot.
      moveMinX = constraint.left + rect.width / 2;
      moveMaxX = Math.max(
        constraint.left + constraint.width - rect.width / 2,
        moveMinX,
      );
      moveMinY = constraint.top + rect.height / 2;
      moveMaxY = Math.max(
        constraint.top + constraint.height - rect.height / 2,
        moveMinY,
      );
    } else if (block !== null && inline === null) {
      mode = "block";
      resizeAxis = "height";
      // The handle side grows toward the pointer: a bottom handle
      // (block-end — top sheet) grows when dragged down.
      sign = block === "end" ? 1 : -1;
      signY = block === "end" ? 1 : -1;
      startSize = rect.height;
      hardMin = 0;
      hardMax = constraint.height;
      [lo, hi] = strategy.bounds
        ? strategy.bounds(resizeCtx(startSize, 0))
        : [hardMin, hardMax];
      // Anchor the opposite (handle-less) edge — unless it already sits
      // flush against the constraint, where the clamp holds it docked.
      const anchorEdge = block === "start" ? rect.bottom : rect.top;
      const constraintEdge =
        block === "start" ? constraint.top + constraint.height : constraint.top;
      docked = Math.abs(anchorEdge - constraintEdge) < 1;
    } else if (inline !== null && block === null) {
      mode = "inline";
      resizeAxis = "width";
      sign = (inline === "end" ? 1 : -1) * dir;
      signX = handleRight ? 1 : -1;
      startSize = rect.width;
      hardMin = 0;
      hardMax = constraint.width;
      [lo, hi] = strategy.bounds
        ? strategy.bounds(resizeCtx(startSize, 0))
        : [hardMin, hardMax];
      const anchorEdge = handleRight ? rect.left : rect.right;
      const constraintEdge = handleRight
        ? constraint.left
        : constraint.left + constraint.width;
      docked = Math.abs(anchorEdge - constraintEdge) < 1;
    } else {
      return;
    }

    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    lastY = event.clientY;
    lastTime = event.timeStamp;
    velocityX = 0;
    velocityY = 0;
    overlay.style.userSelect = "none";
    overlay.style.setProperty("-webkit-user-select", "none");
    overlay.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const dt = event.timeStamp - lastTime;
    if (dt > 0) {
      velocityX = (event.clientX - lastX) / dt;
      velocityY = (event.clientY - lastY) / dt;
    }
    lastX = event.clientX;
    lastY = event.clientY;
    lastTime = event.timeStamp;

    overlay.style.transition = "none";

    if (mode === "move") {
      // 1:1 inside the constraint, rubber-band resistance beyond it — a
      // flick can still dismiss, a slow over-drag springs back. The drag
      // delta (including overshoot) rides the transient --overlay-dx/-dy;
      // the persisted --overlay-x/-y are written only on release, inside
      // their CSS clamp, so the stylesheet stays the authority on
      // resting bounds.
      overlay.style.setProperty(
        "--overlay-dx",
        `${
          resist(centerX0 + (event.clientX - startX), moveMinX, moveMaxX) -
          centerX0
        }px`,
      );
      overlay.style.setProperty(
        "--overlay-dy",
        `${
          resist(centerY0 + (event.clientY - startY), moveMinY, moveMaxY) -
          centerY0
        }px`,
      );
      return;
    }

    if (mode === "resize") {
      // 1:1, anchored at the opposite corner: the frame is
      // center-anchored, so shifting the location point by half the
      // growth pins that corner and the grip tracks the pointer.
      // Rubber-band resistance past either bound (width from the
      // strategy's bounds; height free).
      const w = resist(startW + (event.clientX - startX) * signX, lo, hi);
      const h = resist(
        startH + (event.clientY - startY) * signY,
        MIN_RESIZE_H,
        maxH,
      );
      overlay.style.setProperty("--overlay-w", `${w}px`);
      overlay.style.setProperty("--overlay-h", `${h}px`);
      overlay.style.setProperty(
        "--overlay-x",
        `${centerX0 - constraint.left + (signX * (w - startW)) / 2}px`,
      );
      overlay.style.setProperty(
        "--overlay-y",
        `${centerY0 - constraint.top + (signY * (h - startH)) / 2}px`,
      );
      return;
    }

    const delta =
      mode === "inline" ? event.clientX - startX : event.clientY - startY;
    const target = startSize + sign * delta;
    const sizeProp = mode === "inline" ? "width" : "height";
    const slideProp = mode === "inline" ? "--overlay-dx" : "--overlay-dy";

    let size: number;
    if (target > hi) {
      size = hi + (target - hi) / RESISTANCE;
      overlay.style[sizeProp] = `${size}px`;
      overlay.style.removeProperty(slideProp);
    } else if (target < lo) {
      // Keep content at the lower bound and slide the surface away past
      // its edge — composed by the stylesheet's translate calc(). The
      // physical sign works out to -sign on both axes (the RTL flip is
      // already folded into the inline sign).
      size = lo;
      overlay.style[sizeProp] = `${lo}px`;
      const slide = lo - Math.max(target, 0);
      overlay.style.setProperty(slideProp, `${-sign * slide}px`);
    } else {
      size = target;
      overlay.style[sizeProp] = `${target}px`;
      overlay.style.removeProperty(slideProp);
    }
    anchorEdgeLocation(size);
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    overlay.releasePointerCapture?.(event.pointerId);

    if (mode === "move") {
      // Project the box center along the flick; outside the constraint
      // — any side — closes, like the sheet. Otherwise the location
      // persists, clamped inside the constraint (resistance overshoot
      // springs back via the CSS transition).
      const rect = overlay.getBoundingClientRect();
      const projectedX =
        rect.left + rect.width / 2 + velocityX * PROJECTION_MS;
      const projectedY =
        rect.top + rect.height / 2 + velocityY * PROJECTION_MS;
      if (
        dismissible &&
        (projectedX < constraint.left ||
          projectedX > constraint.left + constraint.width ||
          projectedY < constraint.top ||
          projectedY > constraint.top + constraint.height)
      ) {
        dismiss();
        return;
      }
      const cx = clamp(
        centerX0 + (event.clientX - startX),
        moveMinX,
        moveMaxX,
      );
      const cy = clamp(
        centerY0 + (event.clientY - startY),
        moveMinY,
        moveMaxY,
      );
      clearDrag();
      overlay.style.setProperty("--overlay-x", `${cx - constraint.left}px`);
      overlay.style.setProperty("--overlay-y", `${cy - constraint.top}px`);
      return;
    }

    if (mode === "resize") {
      // The strategy decides the width (free clamp or snapped); the
      // height stays a free clamp. Positive velocity = shrinking.
      const targetW = startW + (event.clientX - startX) * signX;
      const targetH = startH + (event.clientY - startY) * signY;
      const restW = strategy.rest(resizeCtx(targetW, -velocityX * signX));
      if (restW === null) {
        dismiss();
        return;
      }
      const w = restW;
      const h = clamp(targetH, MIN_RESIZE_H, maxH);
      clearDrag();
      overlay.style.setProperty("--overlay-w", `${w}px`);
      overlay.style.setProperty("--overlay-h", `${h}px`);
      overlay.style.setProperty(
        "--overlay-x",
        `${centerX0 - constraint.left + (signX * (w - startW)) / 2}px`,
      );
      overlay.style.setProperty(
        "--overlay-y",
        `${centerY0 - constraint.top + (signY * (h - startH)) / 2}px`,
      );
      emitResize();
      return;
    }

    // Single-axis detent drag — the strategy snaps (or free-clamps) the
    // size, or dismisses.
    const delta =
      mode === "inline" ? event.clientX - startX : event.clientY - startY;
    const target = startSize + sign * delta;
    const restSize = strategy.rest(resizeCtx(target, -sign * axisVelocity()));
    if (restSize === null) {
      dismiss();
      return;
    }
    clearDrag();
    overlay.style.setProperty(
      resizeAxis === "width" ? "--overlay-w" : "--overlay-h",
      `${restSize}px`,
    );
    anchorEdgeLocation(restSize);
    emitResize();
  };

  const onCancel = () => {
    if (!dragging) return;
    dragging = false;
    if (mode === "move") {
      // The drag delta lived in --overlay-dx/-dy; the persisted location
      // was never touched.
      clearDrag();
    } else if (mode === "resize") {
      clearDrag();
      restoreChannel("--overlay-x", prev.x);
      restoreChannel("--overlay-y", prev.y);
      restoreChannel("--overlay-w", prev.w);
      restoreChannel("--overlay-h", prev.h);
    } else {
      clearDrag();
      // A detent/free resize may have shifted the location to anchor an
      // edge — put it back.
      restoreChannel("--overlay-x", prev.x);
      restoreChannel("--overlay-y", prev.y);
    }
  };

  overlay.addEventListener("pointerdown", onPointerDown);
  overlay.addEventListener("pointermove", onPointerMove);
  overlay.addEventListener("pointerup", onPointerEnd);
  overlay.addEventListener("pointercancel", onCancel);
  // Native touch scrolling would cancel the pointer drag — block it while
  // a drag is active. Must be non-passive.
  overlay.addEventListener("touchmove", blockScroll, { passive: false });

  const dispose = () => {
    overlay.removeEventListener("pointerdown", onPointerDown);
    overlay.removeEventListener("pointermove", onPointerMove);
    overlay.removeEventListener("pointerup", onPointerEnd);
    overlay.removeEventListener("pointercancel", onCancel);
    overlay.removeEventListener("touchmove", blockScroll);
  };
  onCleanup(dispose);

  return {
    resize(size) {
      const { block, inline } = parseResize(
        overlay.getAttribute("data-resize") ?? "",
      );
      const channel =
        block !== null && inline === null ? "--overlay-h" : "--overlay-w";
      overlay.style.setProperty(channel, `${size}px`);
      emitResize();
    },
    dispose,
    [Symbol.dispose]: dispose,
  };
}
