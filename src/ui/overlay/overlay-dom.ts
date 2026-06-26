/**
 * Overlay DOM — the only element-touching code. Two halves:
 *
 * - `createFrameIO`: reads the engage-time environment off the element
 *   (`engage`, turning layout into the plain-number {@link Snapshot} /
 *   {@link Resizer} / {@link MoveDeps} the pure modes consume) and renders
 *   their output back to the `--overlay-*` channels (`sync` / `commit`) or
 *   reverts/dismisses.
 * - `createGestureRecognizer`: generic single-pointer drag plumbing
 *   (capture, velocity, the touch-scroll block) that drives a {@link Session}.
 *
 * Everything between — the mode reducers and their math — stays pure and
 * element-free (`gesture-model` + the mode files).
 */

import { resolveConstraint } from "./constrain.ts";
import {
  type Box,
  type Frame,
  type FrameIO,
  type FramePatch,
  type Pointer,
  type Session,
  updateVelocity,
} from "./gesture-model.ts";
import type { ResizeContext, ResizeStrategy } from "./resize-strategy.ts";

const CHANNEL: Record<keyof Frame, string> = {
  x: "--overlay-x",
  y: "--overlay-y",
  w: "--overlay-w",
  h: "--overlay-h",
};

export function createFrameIO(
  overlay: HTMLElement,
  options: {
    strategy: ResizeStrategy;
    dismissible: boolean;
    velocityThreshold: number;
  },
): FrameIO {
  const { strategy, dismissible, velocityThreshold } = options;

  const getProp = (name: string) => overlay.style.getPropertyValue(name);
  const setLen = (name: string, px: number) =>
    overlay.style.setProperty(name, `${px}px`);

  /** Channels at engage — `revert`/`dismiss` restore these. */
  let prev: Record<keyof Frame, string> = { x: "", y: "", w: "", h: "" };

  const restoreChannel = (name: string, value: string) => {
    if (value) overlay.style.setProperty(name, value);
    else overlay.style.removeProperty(name);
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

  const emitResize = () => {
    overlay.dispatchEvent(
      new CustomEvent("resizechange", {
        bubbles: true,
        composed: true,
        detail: {
          width: getProp("--overlay-w") || undefined,
          height: getProp("--overlay-h") || undefined,
        },
      }),
    );
  };

  /** Resolves a CSS length to px in the overlay's context (strategy steps). */
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

  const writeFrame = (frame: Partial<Frame>) => {
    for (const k of ["x", "y", "w", "h"] as const) {
      const v = frame[k];
      if (v !== undefined) setLen(CHANNEL[k], v);
    }
  };

  const applyOffset = (name: string, v: number | null | undefined) => {
    if (v === undefined) return;
    if (v === null) overlay.style.removeProperty(name);
    else setLen(name, v);
  };

  return {
    engage() {
      const constraint = resolveConstraint(overlay);
      const rect = overlay.getBoundingClientRect();
      prev = {
        x: getProp("--overlay-x"),
        y: getProp("--overlay-y"),
        w: getProp("--overlay-w"),
        h: getProp("--overlay-h"),
      };
      const dir = getComputedStyle(overlay).direction === "rtl" ? -1 : 1;

      const ctx = (q: {
        size: number;
        velocity: number;
        axis: "width" | "height";
        startSize: number;
        min: number;
        max: number;
      }): ResizeContext => ({
        ...q,
        dismissible,
        velocityThreshold,
        resolve: (value) =>
          typeof value === "number"
            ? value * (q.axis === "width" ? constraint.width : constraint.height)
            : probeLength(value, q.axis),
      });

      return {
        snapshot: {
          constraint,
          rect,
          center0: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          },
          dir,
        },
        resizer: {
          bounds: (a) =>
            strategy.bounds
              ? strategy.bounds(ctx({ ...a, size: a.startSize, velocity: 0 }))
              : [a.min, a.max],
          rest: (a, drag) => strategy.rest(ctx({ ...a, ...drag })),
        },
        move: {
          dismissible,
          liveRect: () => overlay.getBoundingClientRect() as Box,
        },
      };
    },

    sync(patch) {
      overlay.style.transition = "none";
      if (patch.frame) {
        const f = patch.frame;
        // Live size renders inline (instant, no transition); position to the
        // channels. On commit it all moves to channels and animates.
        if (f.w !== undefined) overlay.style.width = `${f.w}px`;
        if (f.h !== undefined) overlay.style.height = `${f.h}px`;
        if (f.x !== undefined) setLen("--overlay-x", f.x);
        if (f.y !== undefined) setLen("--overlay-y", f.y);
      }
      if (patch.offset) {
        applyOffset("--overlay-dx", patch.offset.dx);
        applyOffset("--overlay-dy", patch.offset.dy);
      }
    },

    commit(frame) {
      clearDrag();
      writeFrame(frame);
      if (frame.w !== undefined || frame.h !== undefined) emitResize();
    },

    dismiss() {
      clearDrag();
      // Revert just this gesture — restore the channels as they were at
      // engage (a prior persisted move/resize, or the author's morph,
      // survives; only this gesture's changes are undone).
      restoreChannel("--overlay-x", prev.x);
      restoreChannel("--overlay-y", prev.y);
      restoreChannel("--overlay-w", prev.w);
      restoreChannel("--overlay-h", prev.h);
      if (overlay instanceof HTMLDialogElement && overlay.open) overlay.close();
      else (overlay as { hidePopover?: () => void }).hidePopover?.();
    },

    revert(keys) {
      clearDrag();
      for (const k of keys) restoreChannel(CHANNEL[k], prev[k]);
    },
  };
}

export interface RecognizerOptions {
  /** Cheap guard run before engaging — bail without capturing the pointer
   * (interactive children, scrolled content, etc.). */
  canEngage(event: PointerEvent): boolean;
  /** The session (if any) this pointerdown starts. `null` = ignore. */
  engage(event: PointerEvent): Session | null;
}

export interface GestureRecognizer {
  dispose(): void;
}

/**
 * The pointer loop for `target`: single-pointer capture, velocity tracking,
 * text-selection suppression, and a non-passive `touchmove` block while a
 * drag is live. It owns the "is a drag active" state and drives the engaged
 * {@link Session} — `move`/`release`/`cancel` on pointermove/up/cancel. The
 * session owns the DOM writes (through the `io` it closed over); the
 * recognizer knows nothing about channels.
 */
export function createGestureRecognizer(
  target: HTMLElement,
  { canEngage, engage }: RecognizerOptions,
): GestureRecognizer {
  let active: Session | null = null;
  let pointer: Pointer | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (active) return;
    if (!canEngage(event)) return;
    const session = engage(event);
    if (!session) return;

    active = session;
    const c = { x: event.clientX, y: event.clientY };
    pointer = {
      start: { ...c },
      prev: { ...c },
      current: { ...c },
      lastTime: event.timeStamp,
      velocity: { x: 0, y: 0 },
    };
    target.style.userSelect = "none";
    target.style.setProperty("-webkit-user-select", "none");
    target.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!active || !pointer) return;
    const c = { x: event.clientX, y: event.clientY };
    pointer.velocity = updateVelocity(pointer, c, event.timeStamp);
    pointer.prev = c;
    pointer.lastTime = event.timeStamp;
    pointer.current = c;
    active.move(pointer);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!active || !pointer) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    const session = active;
    active = null;
    target.releasePointerCapture?.(event.pointerId);
    session.release(pointer);
    pointer = null;
  };

  const onPointerCancel = () => {
    if (!active) return;
    const session = active;
    active = null;
    pointer = null;
    session.cancel();
  };

  const blockScroll = (event: TouchEvent) => {
    if (active) event.preventDefault();
  };

  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", onPointerUp);
  target.addEventListener("pointercancel", onPointerCancel);
  target.addEventListener("touchmove", blockScroll, { passive: false });

  return {
    dispose() {
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", onPointerUp);
      target.removeEventListener("pointercancel", onPointerCancel);
      target.removeEventListener("touchmove", blockScroll);
    },
  };
}
