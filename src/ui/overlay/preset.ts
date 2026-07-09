import { resolveConstraint } from "./constraint.ts";
import { clamp, PROJECTION_MS, resist } from "./session.ts";

/**
 * The markup gesture preset — everything behind `data-resize` /
 * `data-draggable`, in one place: the value vocabulary, the zone
 * dispatch, the per-dimension reducer, the channel I/O, and the pointer
 * recognizer. `Overlay` wires it; the physics come from the same pure
 * functions the public `Session` uses (session.ts).
 *
 * In box space every gesture is the same idea — some edges follow the
 * pointer, the rest stay pinned: an edge word drives one dimension, a
 * corner grip two, `data-draggable` moves all four edges together (a
 * translate). Each driven dimension is described by a {@link Dim}; the
 * differences between handle shapes are `Dim` fields, not code paths.
 */

/** Corner grip: square engagement zone at the handle corner. */
export const RESIZE_ZONE_PX = 28;
/** Draggable: top strip that engages the x/y move. */
export const MOVE_ZONE_PX = 28;
/** Corner grip: minimum width / height. */
const MIN_RESIZE_W = 240;
const MIN_RESIZE_H = 160;

export interface Point {
  x: number;
  y: number;
}

/** The constraint rect (and any axis-aligned region). */
export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** A rendered box — `Rect` plus the far edges. `DOMRect` satisfies it. */
export interface Box extends Rect {
  right: number;
  bottom: number;
}

/** Live pointer tracking for one drag — owned by the recognizer, passed
 * to the active session on every move/release. */
export interface Pointer {
  start: Point;
  prev: Point;
  current: Point;
  lastTime: number;
  /** Per-axis velocity, px/ms (sign = pointer direction). */
  velocity: Point;
}

/** The four persisted channels as one value (1:1 `--overlay-{x,y,w,h}`).
 * x/y are rect-relative box-CENTER lengths; w/h are the size channels. */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The unclamped transient translate offset (1:1 `--overlay-{dx,dy}`) —
 * composed into the CSS translate on top of the clamped position, so the
 * surface can overshoot/fling past the edge. `null` for an axis = clear it. */
export interface Offset {
  dx?: number | null;
  dy?: number | null;
}

/** Engage-time geometry — pure px layout facts. */
export interface Snapshot {
  readonly constraint: Rect;
  readonly rect: Box;
  readonly center0: Point;
  readonly dir: 1 | -1;
}

/** Per-gesture policy + the one live DOM read the move dismiss needs. */
export interface GestureDeps {
  readonly dismissible: boolean;
  readonly velocityThreshold: number;
  liveRect(): Box;
}

/** The element side a session writes through (see `createFrameIO`). */
export interface FrameIO {
  /** Snapshot the element into the pure parts for the engaging drag. */
  engage(): { snapshot: Snapshot; deps: GestureDeps };
  /** Live render (transition suppressed): size inline, position + offset. */
  sync(patch: { frame?: Partial<Frame>; offset?: Offset }): void;
  /** Persist a frame to the channels (animated); emits `resizechange` for w/h. */
  commit(frame: Partial<Frame>): void;
  /** Restore the named channels to their engage values. */
  revert(keys: ReadonlyArray<keyof Frame>): void;
  /** Restore all channels and close the overlay. */
  dismiss(): void;
}

/** One drag session — computes geometry per pointer event and writes it
 * through the `io` it closed over on engage. */
export interface GestureSession {
  move(p: Pointer): void;
  release(p: Pointer): void;
  cancel(): void;
}

/* ------------------------------------------------------------------ *
 * Dispatch — the markup vocabulary and the engagement zones.          *
 * ------------------------------------------------------------------ */

/**
 * The block / inline handle sides a `data-resize` value encodes. Edges
 * name one axis (`block-start`, `inline-end` → the other side `null`);
 * corners name both as a `start`/`end` pair, block side first
 * (`end-end`, `start-end`).
 */
export function parseResize(resize: string): {
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
 * Which gesture a pointerdown engages, by zone priority: corner grip →
 * move strip → whole-surface edge drag. Returns `null` when the pointer
 * misses every zone.
 */
export function detectEngagement(args: {
  block: "start" | "end" | null;
  inline: "start" | "end" | null;
  draggable: boolean;
  rect: Box;
  pointer: Point;
  dir: 1 | -1;
}): "resize" | "move" | "block" | "inline" | null {
  const { block, inline, draggable, rect, pointer, dir } = args;
  const corner = block !== null && inline !== null;
  const handleRight = (inline === "end") === (dir === 1);
  const inCorner =
    corner &&
    Math.abs(pointer.x - (handleRight ? rect.right : rect.left)) <=
      RESIZE_ZONE_PX &&
    Math.abs(pointer.y - (block === "end" ? rect.bottom : rect.top)) <=
      RESIZE_ZONE_PX;
  if (inCorner) return "resize";

  // The block-start sheet's resize pill sits at top-center, so its move
  // engages only from the top-start corner (the drag dot), leaving the
  // pill free to resize.
  const topCenterResize = block === "start" && inline === null;
  const inMoveZone =
    draggable &&
    pointer.y - rect.top >= 0 &&
    pointer.y - rect.top <= MOVE_ZONE_PX &&
    (!topCenterResize ||
      Math.abs(pointer.x - (dir === 1 ? rect.left : rect.right)) <=
        MOVE_ZONE_PX);
  if (inMoveZone) return "move";

  if (block !== null && inline === null) return "block";
  if (inline !== null && block === null) return "inline";
  return null;
}

/* ------------------------------------------------------------------ *
 * Edge math — pure helpers the per-dimension reducer builds on.       *
 * ------------------------------------------------------------------ */

/**
 * Edge-drag setup: the growth `sign` (handle grows toward the pointer),
 * the `anchorSign` for the location shift, and whether the handle-less
 * edge already sits flush against the constraint (`docked` → the CSS clamp
 * holds it, skip the shift).
 */
export function edgeSetup(args: {
  axis: "block" | "inline";
  side: "start" | "end";
  rect: Box;
  constraint: Rect;
  dir: 1 | -1;
}): { sign: number; anchorSign: number; docked: boolean } {
  const { axis, side, rect, constraint, dir } = args;
  if (axis === "block") {
    const sign = side === "end" ? 1 : -1;
    const anchorEdge = side === "start" ? rect.bottom : rect.top;
    const constraintEdge =
      side === "start" ? constraint.top + constraint.height : constraint.top;
    return {
      sign,
      anchorSign: sign,
      docked: Math.abs(anchorEdge - constraintEdge) < 1,
    };
  }
  const handleRight = (side === "end") === (dir === 1);
  const anchorEdge = handleRight ? rect.left : rect.right;
  const constraintEdge = handleRight
    ? constraint.left
    : constraint.left + constraint.width;
  return {
    sign: (side === "end" ? 1 : -1) * dir,
    anchorSign: handleRight ? 1 : -1,
    docked: Math.abs(anchorEdge - constraintEdge) < 1,
  };
}

/**
 * Edge-drag resolution: from a target size + soft bounds, the rendered
 * size and the slide offset (the value to write to `--overlay-dx/-dy`, or
 * `null` to remove it). Both bounds rubber-band, but in different channels:
 *
 * - Above `hi` the size grows with resistance, but only up to the hard `max`
 *   (the room from the anchored edge to the constraint). Past the room the
 *   box cannot grow — `max-width`/`-height` caps it and the location clamp
 *   would shove the *anchored* edge inward — so the size pins to `max` and
 *   the resisted overshoot rides the unclamped slide instead, translating
 *   the whole surface past the edge (handle-side rubber-band). On release the
 *   rest clamps to the room and the slide clears, snapping it back in.
 * - Below `lo` the size pins to `lo` and the surface slides toward its edge
 *   (the dismiss preview).
 */
export function edgeDrag(args: {
  target: number;
  lo: number;
  hi: number;
  sign: number;
  max?: number;
}): { size: number; slide: number | null } {
  const { target, lo, hi, sign, max = Infinity } = args;
  if (target > hi) return slidePastRoom(resist(target, lo, hi), max, sign);
  if (target < lo) {
    return { size: lo, slide: -sign * (lo - Math.max(target, 0)) };
  }
  return { size: target, slide: null };
}

/**
 * Cap a resisted size at the room `max`; route the resisted overshoot beyond
 * it to the slide channel (translating the surface past the edge instead of
 * letting the CSS clamp shove the anchored edge). `null` slide within the room.
 * The handle-side rubber-band shared by the edge ({@link edgeDrag}) and corner
 * resizes — both can only grow until the handle reaches the constraint.
 */
export function slidePastRoom(
  resisted: number,
  max: number,
  sign: number,
): { size: number; slide: number | null } {
  if (resisted <= max) return { size: resisted, slide: null };
  return { size: max, slide: sign * (resisted - max) };
}

/**
 * Pin the opposite edge along one axis: shift the center-anchored location
 * by half the size change. Returns the rect-relative center coordinate, or
 * `null` when docked (the CSS clamp already holds that edge). The single
 * source of anchoring truth for block, inline, and corner resizes.
 */
export function anchor(args: {
  axis: "width" | "height";
  center0: Point;
  constraint: Rect;
  anchorSign: number;
  startSize: number;
  size: number;
  docked: boolean;
}): number | null {
  const { axis, center0, constraint, anchorSign, startSize, size, docked } =
    args;
  if (docked) return null;
  const origin = axis === "width" ? constraint.left : constraint.top;
  const c0 = axis === "width" ? center0.x : center0.y;
  return c0 - origin + (anchorSign * (size - startSize)) / 2;
}

/* ------------------------------------------------------------------ *
 * The sessions — one per-dimension reducer for every handle shape,    *
 * plus the translate (move).                                          *
 * ------------------------------------------------------------------ */

/** One driven dimension of a resize drag. */
interface Dim {
  /** The channel/frame keys this dimension writes. */
  size: "w" | "h";
  loc: "x" | "y";
  offset: "dx" | "dy";
  /** Pointer axis driving it. */
  pointer: keyof Point;
  axis: "width" | "height";
  startSize: number;
  /** Growth sign (handle grows toward the pointer) + anchoring. */
  sign: number;
  anchorSign: number;
  docked: boolean;
  /** Hard room from the anchored edge to the constraint. */
  hardMin: number;
  hardMax: number;
  /** May this dimension's rest dismiss (shrink-past-min flick) — false
   * for the corner's free height clamp. */
  dismisses: boolean;
  /** Below the lower bound: pin + slide toward the edge (edge handles,
   * the dismiss preview) or plain resistance (corner). */
  belowLo: "slide" | "resist";
}

/** An edge word — one driven dimension. */
function edgeDim(
  axis: "block" | "inline",
  side: "start" | "end",
  snap: Snapshot,
): Dim {
  const { sign, anchorSign, docked } = edgeSetup({
    axis,
    side,
    rect: snap.rect,
    constraint: snap.constraint,
    dir: snap.dir,
  });
  // Room from the *anchored* edge to the far constraint edge — not the
  // full constraint span. The anchored edge holds, so the surface can
  // only grow until the handle reaches the constraint; past that point
  // the CSS clamp would shove the anchored edge inward.
  const hardMax =
    axis === "block"
      ? anchorSign > 0
        ? snap.constraint.top + snap.constraint.height - snap.rect.top
        : snap.rect.bottom - snap.constraint.top
      : anchorSign > 0
        ? snap.constraint.left + snap.constraint.width - snap.rect.left
        : snap.rect.right - snap.constraint.left;
  const width = axis === "inline";
  return {
    size: width ? "w" : "h",
    loc: width ? "x" : "y",
    offset: width ? "dx" : "dy",
    pointer: width ? "x" : "y",
    axis: width ? "width" : "height",
    startSize: width ? snap.rect.width : snap.rect.height,
    sign,
    anchorSign,
    docked,
    hardMin: 0,
    hardMax,
    dismisses: true,
    belowLo: "slide",
  };
}

/** A corner grip — two driven dimensions, opposite corner anchored. The
 * axes are asymmetric: the width alone decides dismissal; the height is
 * a free clamp that never dismisses. */
function cornerDims(
  block: "start" | "end",
  inline: "start" | "end",
  snap: Snapshot,
): [Dim, Dim] {
  const dir = snap.dir;
  const signX = (inline === "end" ? 1 : -1) * dir;
  const signY = block === "end" ? 1 : -1;
  const handleRight = (inline === "end") === (dir === 1);
  const maxW = handleRight
    ? snap.constraint.left + snap.constraint.width - snap.rect.left
    : snap.rect.right - snap.constraint.left;
  const maxH =
    block === "end"
      ? snap.constraint.top + snap.constraint.height - snap.rect.top
      : snap.rect.bottom - snap.constraint.top;
  return [
    {
      size: "w", loc: "x", offset: "dx", pointer: "x", axis: "width",
      startSize: snap.rect.width,
      sign: signX, anchorSign: signX, docked: false,
      hardMin: MIN_RESIZE_W, hardMax: maxW,
      dismisses: true, belowLo: "resist",
    },
    {
      size: "h", loc: "y", offset: "dy", pointer: "y", axis: "height",
      startSize: snap.rect.height,
      sign: signY, anchorSign: signY, docked: false,
      hardMin: MIN_RESIZE_H, hardMax: maxH,
      dismisses: false, belowLo: "resist",
    },
  ];
}

/**
 * The one resize session — edge handles (one `Dim`) and corner grips
 * (two) reduce identically per dimension: target size from the pointer
 * delta, rubber at the bounds, overshoot past the room riding the slide
 * channel, the opposite edge pinned by the location shift (unless
 * docked — then the CSS clamp holds it). On release the size clamps
 * into the room; a shrink-projected flick past the minimum dismisses.
 */
export function resizeGesture(
  snap: Snapshot,
  deps: GestureDeps,
  io: FrameIO,
  dims: Dim[],
): GestureSession {
  const anchorAt = (d: Dim, size: number) =>
    anchor({
      axis: d.axis,
      center0: snap.center0,
      constraint: snap.constraint,
      anchorSign: d.anchorSign,
      startSize: d.startSize,
      size,
      docked: d.docked,
    });

  return {
    move(p) {
      const frame: Partial<Frame> = {};
      const offset: Offset = {};
      for (const d of dims) {
        const target =
          d.startSize + d.sign * (p.current[d.pointer] - p.start[d.pointer]);
        const { size, slide } =
          d.belowLo === "slide"
            ? edgeDrag({
                target,
                lo: d.hardMin,
                hi: d.hardMax,
                sign: d.sign,
                max: d.hardMax,
              })
            : slidePastRoom(
                resist(target, d.hardMin, d.hardMax),
                d.hardMax,
                d.sign,
              );
        frame[d.size] = size;
        const a = anchorAt(d, size);
        if (a !== null) frame[d.loc] = a;
        offset[d.offset] = slide;
      }
      io.sync({ frame, offset });
    },
    release(p) {
      const frame: Partial<Frame> = {};
      for (const d of dims) {
        const target =
          d.startSize + d.sign * (p.current[d.pointer] - p.start[d.pointer]);
        // Free rest: clamp into the room; a shrink-projected flick past
        // the minimum dismisses (velocity positive = shrinking).
        const velocity = -d.sign * p.velocity[d.pointer];
        const projected = target - velocity * PROJECTION_MS;
        if (
          d.dismisses &&
          deps.dismissible &&
          (projected < d.hardMin / 2 ||
            (target < d.hardMin && velocity > deps.velocityThreshold))
        ) {
          return io.dismiss();
        }
        const size = clamp(target, d.hardMin, d.hardMax);
        frame[d.size] = size;
        const a = anchorAt(d, size);
        if (a !== null) frame[d.loc] = a;
      }
      io.commit(frame);
    },
    cancel() {
      io.revert(["x", "y", "w", "h"]);
    },
  };
}

/** Move bounds on the box center — the same clamp the stylesheet applies
 * to the persisted location point (center floor = half the box). */
function moveBounds(rect: Box, constraint: Rect) {
  const minX = constraint.left + rect.width / 2;
  const minY = constraint.top + rect.height / 2;
  return {
    minX,
    minY,
    maxX: Math.max(constraint.left + constraint.width - rect.width / 2, minX),
    maxY: Math.max(constraint.top + constraint.height - rect.height / 2, minY),
  };
}

/** Whether a flicked move's projected center leaves the constraint. */
function projectedOutOfBounds(rect: Box, velocity: Point, constraint: Rect) {
  const px = rect.left + rect.width / 2 + velocity.x * PROJECTION_MS;
  const py = rect.top + rect.height / 2 + velocity.y * PROJECTION_MS;
  return (
    px < constraint.left ||
    px > constraint.left + constraint.width ||
    py < constraint.top ||
    py > constraint.top + constraint.height
  );
}

/**
 * The move session — x/y drag (all four edges travel together), 1:1
 * inside the constraint with rubber past it, flick off the constraint
 * to dismiss. The live delta rides the unclamped `--overlay-dx/-dy`;
 * the rested box center commits to the location channels.
 */
export function moveGesture(
  snap: Snapshot,
  deps: GestureDeps,
  io: FrameIO,
): GestureSession {
  const bounds = moveBounds(snap.rect, snap.constraint);
  const at = (p: Pointer) => ({
    x: snap.center0.x + (p.current.x - p.start.x),
    y: snap.center0.y + (p.current.y - p.start.y),
  });
  return {
    move(p) {
      const c = at(p);
      io.sync({
        offset: {
          dx: resist(c.x, bounds.minX, bounds.maxX) - snap.center0.x,
          dy: resist(c.y, bounds.minY, bounds.maxY) - snap.center0.y,
        },
      });
    },
    release(p) {
      if (
        deps.dismissible &&
        projectedOutOfBounds(deps.liveRect(), p.velocity, snap.constraint)
      ) {
        return io.dismiss();
      }
      const c = at(p);
      io.commit({
        x: clamp(c.x, bounds.minX, bounds.maxX) - snap.constraint.left,
        y: clamp(c.y, bounds.minY, bounds.maxY) - snap.constraint.top,
      });
    },
    cancel() {
      io.revert(["x", "y", "w", "h"]);
    },
  };
}

/** Build the session for an engaged zone (the preset's dispatcher). */
export function selectSession(
  key: "block" | "inline" | "resize" | "move",
  parsed: { block: "start" | "end" | null; inline: "start" | "end" | null },
  snapshot: Snapshot,
  deps: GestureDeps,
  io: FrameIO,
): GestureSession {
  if (key === "move") return moveGesture(snapshot, deps, io);
  const dims =
    key === "resize"
      ? cornerDims(parsed.block!, parsed.inline!, snapshot)
      : key === "block"
        ? [edgeDim("block", parsed.block!, snapshot)]
        : [edgeDim("inline", parsed.inline!, snapshot)];
  return resizeGesture(snapshot, deps, io, dims);
}

/* ------------------------------------------------------------------ *
 * The DOM side — channel I/O and the pointer recognizer.              *
 * ------------------------------------------------------------------ */

const CHANNEL: Record<keyof Frame, string> = {
  x: "--overlay-x",
  y: "--overlay-y",
  w: "--overlay-w",
  h: "--overlay-h",
};

export function createFrameIO(
  overlay: HTMLElement,
  options: { dismissible: boolean; velocityThreshold: number },
): FrameIO {
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
        deps: {
          dismissible: options.dismissible,
          velocityThreshold: options.velocityThreshold,
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

/** New per-axis velocity (px/ms) from a move; keeps the prior value when
 * the timestamp doesn't advance (synthetic events). */
export function updateVelocity(
  prev: { prev: Point; lastTime: number; velocity: Point },
  client: Point,
  timeStamp: number,
): Point {
  const dt = timeStamp - prev.lastTime;
  if (dt > 0) {
    return {
      x: (client.x - prev.prev.x) / dt,
      y: (client.y - prev.prev.y) / dt,
    };
  }
  return prev.velocity;
}

export interface RecognizerOptions {
  /** Cheap guard run before engaging — bail without capturing the pointer
   * (interactive children, scrolled content, etc.). */
  canEngage(event: PointerEvent): boolean;
  /** The session (if any) this pointerdown starts. `null` = ignore. */
  engage(event: PointerEvent): GestureSession | null;
}

/**
 * The pointer loop for `target`: single-pointer capture, velocity
 * tracking, text-selection suppression, and a non-passive `touchmove`
 * block while a drag is live. It owns the "is a drag active" state and
 * drives the engaged {@link GestureSession}. The session owns the DOM
 * writes (through the `io` it closed over); the recognizer knows
 * nothing about channels.
 */
export function createGestureRecognizer(
  target: HTMLElement,
  { canEngage, engage }: RecognizerOptions,
): { dispose(): void } {
  let active: GestureSession | null = null;
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
