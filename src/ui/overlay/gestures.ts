import { onCleanup } from "@/signals/index.ts";

/**
 * Opt-in pointer gestures for `.x-overlay`, dispatched by placement:
 *
 * - Block-edge placements (`data-placement` containing `block-start` or
 *   `block-end` — full-width sheets and floating corner panels) drag
 *   between height detents.
 * - Drawers (pure `inline-start` / `inline-end`) drag between width
 *   detents, direction-aware (`:dir(rtl)` flips the sign).
 * - Center (no placement) is an iPad-style window with two handles:
 *   - The top grabber moves it in x/y, constrained to the viewport with
 *     rubber-band resistance at the edges. The position persists across
 *     releases via the JS-owned `--overlay-mx`/`--overlay-my` offsets
 *     (composed into translate only by the center rule, so placement
 *     morphs ignore them and morphing back restores the spot), and
 *     flinging the window off-screen — any side — closes it when
 *     `dismissible` (a slow over-drag springs back instead).
 *   - The bottom inline-end corner grip resizes, anchored at the
 *     opposite (top inline-start) corner like a desktop window, so the
 *     grip tracks the pointer 1:1 and the window never grows past the
 *     viewport — the bounds rubber-band like everything else. Free-form
 *     by default: the size persists via the JS-owned
 *     `--overlay-w`/`--overlay-h` (which only the center placement
 *     reads). Pass a `detents` option and the release snaps to the
 *     stylesheet's width steps via `data-detent` instead. Either way,
 *     shrinking past the minimum dismisses.
 *
 * CSS owns the detent positions (`data-detent` + `--overlay-detent-*`) and
 * the animated transition between them; this factory only adds what CSS
 * cannot. The overlay stays fully functional without it. While attached it
 * sets `data-overlay-gestures` on the frame, which gates the stylesheet's
 * affordances (grabber pill, resize grip) — no drag wiring, no affordance.
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
 * `hidePopover()` otherwise.
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
   * Detents the overlay may rest at. Default: all three. On center
   * overlays, passing this switches the corner resize from free-form to
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
/** Block-edge placements drag along the block (height) axis. */
const BLOCK_EDGE = /(?:^|\s)block-(start|end)(?:\s|$)/;
/** Inline placements drag along the inline (width) axis. */
const INLINE_EDGE = /(?:^|\s)inline-(start|end)(?:\s|$)/;
/** Center: square engagement zone at the bottom inline-end corner. */
const RESIZE_ZONE_PX = 28;
/** Center: top strip that engages the x/y window move. */
const MOVE_ZONE_PX = 28;
/** Center resize: minimum size (free mode). */
const MIN_RESIZE_W = 240;
const MIN_RESIZE_H = 160;

type Mode = "block" | "inline" | "resize" | "move";

/** Clamp with rubber-band resistance past either bound. */
function resist(value: number, min: number, max: number): number {
  if (value > max) return max + (value - max) / RESISTANCE;
  if (value < min) return min - (min - value) / RESISTANCE;
  return value;
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

  const dismiss = () => {
    clearDrag();
    // Reset the center window's persisted position and size — a closed
    // window reopens fresh. No-ops for the other placements.
    overlay.style.removeProperty("--overlay-mx");
    overlay.style.removeProperty("--overlay-my");
    overlay.style.removeProperty("--overlay-w");
    overlay.style.removeProperty("--overlay-h");
    if (overlay instanceof HTMLDialogElement && overlay.open) {
      overlay.close();
    } else {
      (overlay as { hidePopover?: () => void }).hidePopover?.();
    }
  };

  // Center resize: free unless the caller opted into steps.
  const centerSnapping = options?.detents != null;

  let mode: Mode = "block";
  let startX = 0;
  let startY = 0;
  let startSize = 0;
  let startW = 0;
  let startH = 0;
  let prevW = "";
  let prevH = "";
  /** Persisted move offsets captured at engage (raw + numeric). */
  let prevDxRaw = "";
  let prevDyRaw = "";
  let prevDx = 0;
  let prevDy = 0;
  /** Move offset bounds keeping the window inside the viewport. */
  let dxMin = 0;
  let dxMax = 0;
  let dyMin = 0;
  let dyMax = 0;
  /** Resize bounds — the anchored corner pins the max to the viewport. */
  let maxW = 0;
  let maxH = 0;
  /** +1 dragging toward the far edge grows the surface, -1 shrinks. */
  let sign = -1;
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

  /** Re-apply the move offsets captured at engage (center gestures must
   * not wipe a persisted window position when their scaffolding clears). */
  const restoreOffsets = () => {
    if (prevDxRaw) overlay.style.setProperty("--overlay-mx", prevDxRaw);
    if (prevDyRaw) overlay.style.setProperty("--overlay-my", prevDyRaw);
  };

  const insetPx = () => {
    const value = parseFloat(
      getComputedStyle(overlay).getPropertyValue("--overlay-inset"),
    );
    return Number.isNaN(value) ? 16 : value;
  };

  const onPointerDown = (event: PointerEvent) => {
    const placement = overlay.getAttribute("data-placement") ?? "";
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
    const block = BLOCK_EDGE.exec(placement);
    const inline = INLINE_EDGE.exec(placement);

    if (block) {
      mode = "block";
      sign = block[1] === "start" ? 1 : -1;
      startSize = overlay.getBoundingClientRect().height;
      detentsPx = detents.map((d) => resolveDetentPx(overlay, d));
    } else if (inline) {
      mode = "inline";
      // An inline-start drawer (LTR: left edge) grows when dragged toward
      // the inline end; everything flips for inline-end and again in RTL.
      sign = (inline[1] === "start" ? 1 : -1) * dir;
      startSize = overlay.getBoundingClientRect().width;
      detentsPx = detents.map((d) => resolveDetentPx(overlay, d, "width"));
    } else {
      // center — engage only from the corner grip (resize) or the top
      // grabber strip (move), so the card's content stays clickable and
      // selectable.
      const rect = overlay.getBoundingClientRect();
      const cornerX = dir === 1 ? rect.right : rect.left;
      const inCorner =
        Math.abs(event.clientX - cornerX) <= RESIZE_ZONE_PX &&
        Math.abs(event.clientY - rect.bottom) <= RESIZE_ZONE_PX;
      const inTopStrip =
        event.clientY - rect.top >= 0 &&
        event.clientY - rect.top <= MOVE_ZONE_PX;
      if (!inCorner && !inTopStrip) return;

      // Both center gestures capture (and later re-apply) the persisted
      // window offsets.
      prevDxRaw = overlay.style.getPropertyValue("--overlay-mx");
      prevDyRaw = overlay.style.getPropertyValue("--overlay-my");
      prevDx = parseFloat(prevDxRaw) || 0;
      prevDy = parseFloat(prevDyRaw) || 0;

      if (inCorner) {
        mode = "resize";
        startW = rect.width;
        startH = rect.height;
        prevW = overlay.style.getPropertyValue("--overlay-w");
        prevH = overlay.style.getPropertyValue("--overlay-h");
        // The top inline-start corner stays anchored, so the room toward
        // the opposite edges bounds the size — handles never leave the
        // viewport.
        maxW = dir === 1 ? window.innerWidth - rect.left : rect.right;
        maxH = window.innerHeight - rect.top;
        if (centerSnapping) {
          detentsPx = detents.map((d) => resolveDetentPx(overlay, d, "width"));
        }
      } else {
        mode = "move";
        // Offset bounds that keep the whole window inside the viewport —
        // derived from the window's position with no drag offset applied.
        const baseLeft = rect.left - prevDx;
        const baseTop = rect.top - prevDy;
        dxMin = -baseLeft;
        dxMax = Math.max(window.innerWidth - rect.width - baseLeft, dxMin);
        dyMin = -baseTop;
        dyMax = Math.max(window.innerHeight - rect.height - baseTop, dyMin);
      }
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
      // 1:1 inside the viewport, rubber-band resistance beyond it —
      // a flick can still dismiss, a slow over-drag springs back.
      // --overlay-mx/-my are composed into translate only by the center
      // rule, so a placement morph ignores the window's position.
      overlay.style.setProperty(
        "--overlay-mx",
        `${resist(prevDx + (event.clientX - startX), dxMin, dxMax)}px`,
      );
      overlay.style.setProperty(
        "--overlay-my",
        `${resist(prevDy + (event.clientY - startY), dyMin, dyMax)}px`,
      );
      return;
    }

    if (mode === "resize") {
      // 1:1, anchored at the top inline-start corner: the frame is
      // center-aligned, so shifting the move offsets by half the growth
      // pins that corner and the grip tracks the pointer. Rubber-band
      // resistance past either bound.
      const minW = centerSnapping
        ? (detentsPx[0] ?? MIN_RESIZE_W)
        : MIN_RESIZE_W;
      const w = resist(startW + (event.clientX - startX) * dir, minW, maxW);
      const h = resist(startH + (event.clientY - startY), MIN_RESIZE_H, maxH);
      overlay.style.setProperty("--overlay-w", `${w}px`);
      overlay.style.setProperty("--overlay-h", `${h}px`);
      overlay.style.setProperty(
        "--overlay-mx",
        `${prevDx + (dir * (w - startW)) / 2}px`,
      );
      overlay.style.setProperty(
        "--overlay-my",
        `${prevDy + (h - startH) / 2}px`,
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

    if (target > largest) {
      overlay.style[sizeProp] = `${largest + (target - largest) / RESISTANCE}px`;
      overlay.style.removeProperty(slideProp);
    } else if (target < smallest) {
      // Keep content at the smallest size and slide the surface away past
      // its edge — composed by the stylesheet's translate calc(). The
      // physical sign works out to -sign on both axes (the RTL flip is
      // already folded into the inline sign).
      overlay.style[sizeProp] = `${smallest}px`;
      const slide = smallest - Math.max(target, 0);
      overlay.style.setProperty(slideProp, `${-sign * slide}px`);
    } else {
      overlay.style[sizeProp] = `${target}px`;
      overlay.style.removeProperty(slideProp);
    }
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    overlay.releasePointerCapture?.(event.pointerId);

    if (mode === "move") {
      // Project the window center along the flick; off-screen — any
      // side — closes, like the sheet. Otherwise the position persists,
      // clamped inside the viewport (resistance overshoot springs back
      // via the CSS transition).
      const rect = overlay.getBoundingClientRect();
      const centerX =
        rect.left + rect.width / 2 + velocityX * PROJECTION_MS;
      const centerY =
        rect.top + rect.height / 2 + velocityY * PROJECTION_MS;
      if (
        dismissible &&
        (centerX < 0 ||
          centerX > window.innerWidth ||
          centerY < 0 ||
          centerY > window.innerHeight)
      ) {
        dismiss();
        return;
      }
      const dx = Math.min(
        Math.max(prevDx + (event.clientX - startX), dxMin),
        dxMax,
      );
      const dy = Math.min(
        Math.max(prevDy + (event.clientY - startY), dyMin),
        dyMax,
      );
      clearDrag();
      overlay.style.setProperty("--overlay-mx", `${dx}px`);
      overlay.style.setProperty("--overlay-my", `${dy}px`);
      return;
    }

    if (mode === "resize") {
      const targetW = startW + (event.clientX - startX) * dir;
      const targetH = startH + (event.clientY - startY);
      // Positive = shrinking, like the detent axes.
      const shrinkVelocity = -velocityX * dir;

      if (centerSnapping) {
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
        // CSS owns the resting step. A persisted position survives,
        // clamped so the snapped size stays inside the viewport (the
        // offset-free center is the viewport center).
        overlay.style.removeProperty("--overlay-w");
        overlay.style.removeProperty("--overlay-h");
        rest(detents[index]);
        if (prevDxRaw || prevDyRaw) {
          const stepW = detentsPx[index];
          const stepH =
            detents[index] === "large"
              ? window.innerHeight - 2 * insetPx()
              : startH;
          const xBound = Math.max((window.innerWidth - stepW) / 2, 0);
          const yBound = Math.max((window.innerHeight - stepH) / 2, 0);
          overlay.style.setProperty(
            "--overlay-mx",
            `${Math.min(Math.max(prevDx, -xBound), xBound)}px`,
          );
          overlay.style.setProperty(
            "--overlay-my",
            `${Math.min(Math.max(prevDy, -yBound), yBound)}px`,
          );
        }
        return;
      }

      // Free mode — shrinking well past the minimum (or flicking shut
      // below it) dismisses; otherwise the clamped size persists (with
      // the half-growth offset shift keeping the corner anchored) and
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
      const w = Math.min(Math.max(targetW, MIN_RESIZE_W), maxW);
      const h = Math.min(Math.max(targetH, MIN_RESIZE_H), maxH);
      clearDrag();
      overlay.style.setProperty("--overlay-w", `${w}px`);
      overlay.style.setProperty("--overlay-h", `${h}px`);
      overlay.style.setProperty(
        "--overlay-mx",
        `${prevDx + (dir * (w - startW)) / 2}px`,
      );
      overlay.style.setProperty(
        "--overlay-my",
        `${prevDy + (h - startH) / 2}px`,
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
    }
  };

  const onCancel = () => {
    if (!dragging) return;
    dragging = false;
    if (mode === "move") {
      clearDrag();
      restoreOffsets();
    } else if (mode === "resize") {
      clearDrag();
      restoreOffsets();
      if (prevW) overlay.style.setProperty("--overlay-w", prevW);
      else overlay.style.removeProperty("--overlay-w");
      if (prevH) overlay.style.setProperty("--overlay-h", prevH);
      else overlay.style.removeProperty("--overlay-h");
    } else {
      rest(currentDetent());
    }
  };

  overlay.addEventListener("pointerdown", onPointerDown);
  overlay.addEventListener("pointermove", onPointerMove);
  overlay.addEventListener("pointerup", onPointerEnd);
  overlay.addEventListener("pointercancel", onCancel);
  // Native touch scrolling would cancel the pointer drag — block it while
  // a drag is active. Must be non-passive.
  overlay.addEventListener("touchmove", blockScroll, { passive: false });
  // Gates the stylesheet's affordances (grabber pill, resize grip).
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
