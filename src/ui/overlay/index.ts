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
 *   everything else. Free-form by default: the size persists via the
 *   public `--overlay-w`/`--overlay-h` channels and the location point
 *   shifts by half the growth (pinning the anchor). Pass a `detents`
 *   option and the release snaps to the stylesheet's width steps via
 *   `data-detent` instead. Either way, shrinking past the minimum
 *   dismisses.
 * - `data-draggable` moves the surface in x/y from the top strip,
 *   constrained to the rect with rubber-band resistance at the edges.
 *   The location persists across releases via the public
 *   `--overlay-x`/`--overlay-y` point (clamped by the stylesheet), and
 *   flinging the surface off the constraint — any side — closes it
 *   when `dismissible` (a slow over-drag springs back instead).
 *
 * CSS owns the detent positions (`data-detent` + `--overlay-detent-*`) and
 * the animated transition between them; this factory only adds what CSS
 * cannot. The overlay stays fully functional without it. While attached it
 * sets `data-overlay-gestures` on the frame, which gates the stylesheet's
 * affordances (grabber pills, corner grip) — no drag wiring, no affordance.
 *
 * While dragging, the overlay's size is driven inline with transitions
 * suppressed; past the smallest detent the surface slides away via the
 * JS-owned `--overlay-dy` (or `--overlay-dx`) variable, which the
 * stylesheet composes into its own `translate` — JS never touches
 * `translate` (or `top`/`left`) itself. On release the gesture snaps to
 * the nearest detent — biased by release velocity — by writing
 * `data-detent` back, so CSS owns every resting state. Dragging past the
 * largest detent rubber-bands; dragging (or flicking) past the smallest
 * closes the overlay when `dismissible` — `close()` for dialogs,
 * `hidePopover()` otherwise. Dismissing restores the channel values the
 * author had set when the gestures attached, so a closed overlay
 * reopens fresh.
 *
 * Registers its cleanup with the current scope (`onCleanup`) and also
 * returns it as `dispose` / `Symbol.dispose`.
 *
 * @example
 * ```ts
 * import { createOverlayGestures } from "elements-kit/ui/overlay";
 *
 * const overlay = document.querySelector("dialog.x-overlay")!;
 * const gestures = createOverlayGestures(overlay);
 * overlay.addEventListener("detentchange", () => console.log(gestures.detent));
 * ```
 */

export type OverlayDetent = "small" | "medium" | "large";

export interface OverlayGestureOptions {
  /**
   * Detents the overlay may rest at. Default: all three. On corner-grip
   * overlays, passing this switches the resize from free-form to
   * snapping between the steps.
   */
  detents?: readonly OverlayDetent[];
  /** Allow drag/flick past the smallest detent to close. Default `true`. */
  dismissible?: boolean;
  /** Release velocity (px/ms, shrinking) that dismisses. Default `0.5`. */
  velocityThreshold?: number;
}

export interface OverlayGestures {
  /** Current resting detent. */
  readonly detent: OverlayDetent;
  /** Snap to a detent (animated by CSS). Dispatches `detentchange`. */
  setDetent(detent: OverlayDetent): void;
  dispose(): void;
  [Symbol.dispose](): void;
}

const ALL_DETENTS: readonly OverlayDetent[] = ["small", "medium", "large"];
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
 * Resolves a detent's `--overlay-detent-*` custom property to pixels by
 * measuring a hidden probe, so `svh` / `calc()` values resolve natively.
 */
export function resolveDetentPx(
  overlay: HTMLElement,
  detent: OverlayDetent,
  axis: "height" | "width" = "height",
): number {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style[axis] = `var(--overlay-detent-${detent})`;
  overlay.appendChild(probe);
  const px = probe.getBoundingClientRect()[axis];
  probe.remove();
  return px;
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

export function createOverlayGestures(
  overlay: HTMLElement,
  options?: OverlayGestureOptions,
): OverlayGestures {
  const detents = options?.detents ?? ALL_DETENTS;
  const dismissible = options?.dismissible ?? true;
  const velocityThreshold = options?.velocityThreshold ?? 0.5;

  const restoreChannel = (name: string, value: string) => {
    if (value) overlay.style.setProperty(name, value);
    else overlay.style.removeProperty(name);
  };

  const currentDetent = (): OverlayDetent => {
    const value = overlay.getAttribute("data-detent") as OverlayDetent | null;
    return value !== null && detents.includes(value)
      ? value
      : detents[detents.length - 1];
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

  const rest = (detent: OverlayDetent) => {
    clearDrag();
    if (detent !== currentDetent()) {
      overlay.setAttribute("data-detent", detent);
      overlay.dispatchEvent(
        new CustomEvent("detentchange", {
          bubbles: true,
          composed: true,
          detail: { detent },
        }),
      );
    }
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

  // Corner resize: free unless the caller opted into steps.
  const cornerSnapping = options?.detents != null;

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
  let detentsPx: number[] = [];
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
      startW = rect.width;
      startH = rect.height;
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
      if (cornerSnapping) {
        detentsPx = detents.map((d) => resolveDetentPx(overlay, d, "width"));
      }
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
      // The handle side grows toward the pointer: a bottom handle
      // (block-end — top sheet) grows when dragged down.
      sign = block === "end" ? 1 : -1;
      signY = block === "end" ? 1 : -1;
      startSize = rect.height;
      detentsPx = detents.map((d) => resolveDetentPx(overlay, d));
      // Anchor the opposite (handle-less) edge — unless it already sits
      // flush against the constraint, where the clamp holds it docked.
      const anchorEdge = block === "start" ? rect.bottom : rect.top;
      const constraintEdge =
        block === "start" ? constraint.top + constraint.height : constraint.top;
      docked = Math.abs(anchorEdge - constraintEdge) < 1;
    } else if (inline !== null && block === null) {
      mode = "inline";
      sign = (inline === "end" ? 1 : -1) * dir;
      signX = handleRight ? 1 : -1;
      startSize = rect.width;
      detentsPx = detents.map((d) => resolveDetentPx(overlay, d, "width"));
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
      // Rubber-band resistance past either bound.
      const minW = cornerSnapping
        ? (detentsPx[0] ?? MIN_RESIZE_W)
        : MIN_RESIZE_W;
      const w = resist(startW + (event.clientX - startX) * signX, minW, maxW);
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
    const largest = detentsPx[detentsPx.length - 1] ?? startSize;
    const smallest = detentsPx[0] ?? 0;
    const sizeProp = mode === "inline" ? "width" : "height";
    const slideProp = mode === "inline" ? "--overlay-dx" : "--overlay-dy";

    let size: number;
    if (target > largest) {
      size = largest + (target - largest) / RESISTANCE;
      overlay.style[sizeProp] = `${size}px`;
      overlay.style.removeProperty(slideProp);
    } else if (target < smallest) {
      // Keep content at the smallest size and slide the surface away past
      // its edge — composed by the stylesheet's translate calc(). The
      // physical sign works out to -sign on both axes (the RTL flip is
      // already folded into the inline sign).
      size = smallest;
      overlay.style[sizeProp] = `${smallest}px`;
      const slide = smallest - Math.max(target, 0);
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
      const targetW = startW + (event.clientX - startX) * signX;
      const targetH = startH + (event.clientY - startY) * signY;
      // Positive = shrinking, like the detent axes.
      const shrinkVelocity = -velocityX * signX;

      if (cornerSnapping) {
        const index = closestDetent(
          targetW,
          detentsPx,
          shrinkVelocity,
          dismissible,
          velocityThreshold,
        );
        if (index === -1) {
          dismiss();
          return;
        }
        // CSS owns the resting step; the dragged location persists,
        // clamped so the snapped size stays inside the constraint.
        overlay.style.removeProperty("--overlay-w");
        overlay.style.removeProperty("--overlay-h");
        rest(detents[index]);
        const stepW = detentsPx[index];
        const cx = clamp(
          centerX0 + (signX * (clamp(targetW, stepW, maxW) - startW)) / 2,
          constraint.left + stepW / 2,
          Math.max(
            constraint.left + constraint.width - stepW / 2,
            constraint.left + stepW / 2,
          ),
        );
        overlay.style.setProperty("--overlay-x", `${cx - constraint.left}px`);
        return;
      }

      // Free mode — shrinking well past the minimum (or flicking shut
      // below it) dismisses; otherwise the clamped size persists (with
      // the half-growth location shift keeping the corner anchored) and
      // any resistance overshoot springs back via the CSS transition.
      const projectedW = targetW - shrinkVelocity * PROJECTION_MS;
      if (
        dismissible &&
        (projectedW < MIN_RESIZE_W / 2 ||
          (targetW < MIN_RESIZE_W && shrinkVelocity > velocityThreshold))
      ) {
        dismiss();
        return;
      }
      const w = clamp(targetW, MIN_RESIZE_W, maxW);
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
      return;
    }

    const delta =
      mode === "inline" ? event.clientX - startX : event.clientY - startY;
    const size = startSize + sign * delta;
    const index = closestDetent(
      size,
      detentsPx,
      -sign * axisVelocity(),
      dismissible,
      velocityThreshold,
    );
    if (index === -1) {
      dismiss();
    } else {
      rest(detents[index]);
      // Re-anchor for the snapped detent's size (rest cleared the inline
      // size; the location persists).
      anchorEdgeLocation(detentsPx[index] ?? startSize);
    }
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
      rest(currentDetent());
      // A detent resize may have shifted the location to anchor an edge —
      // put it back.
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
  // Gates the stylesheet's affordances (grabber pills, corner grip).
  overlay.setAttribute("data-overlay-gestures", "");

  const dispose = () => {
    overlay.removeEventListener("pointerdown", onPointerDown);
    overlay.removeEventListener("pointermove", onPointerMove);
    overlay.removeEventListener("pointerup", onPointerEnd);
    overlay.removeEventListener("pointercancel", onCancel);
    overlay.removeEventListener("touchmove", blockScroll);
    overlay.removeAttribute("data-overlay-gestures");
  };
  onCleanup(dispose);

  return {
    get detent() {
      return currentDetent();
    },
    setDetent(detent) {
      if (detents.includes(detent)) rest(detent);
    },
    dispose,
    [Symbol.dispose]: dispose,
  };
}
