/**
 * The gesture kernel — the value types every layer speaks, the shared pure
 * math, and the one `anchor` primitive. No DOM, no closures over the
 * overlay: plain numbers in, numbers out. The modes and the DOM layer
 * (`overlay-dom`) all build on this; keeping it pure is what makes the gesture
 * unit-testable (the anchoring class of bug is caught here on a plain
 * number rather than only in a laid-out browser). Session-specific math
 * lives with its session (resize-session.ts / move-session.ts).
 */

/** Rubber-band resistance past a bound. */
export const RESISTANCE = 3;
/** Corner grip: square engagement zone at the handle corner. */
export const RESIZE_ZONE_PX = 28;
/** Draggable: top strip that engages the x/y move. */
export const MOVE_ZONE_PX = 28;

export type Axis = "width" | "height";

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

/** Live pointer tracking for one drag — owned by the recognizer, passed to
 * the active mode on every move/release. */
export interface Pointer {
  /** Client coords where the drag engaged. */
  start: Point;
  /** Client coords at the previous move (velocity baseline). */
  prev: Point;
  /** Current client coords. */
  current: Point;
  /** timeStamp at the previous move. */
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

/**
 * A mode's live output. `frame` is the current clamped geometry (the I/O
 * layer renders its size inline during the drag, its position to channels);
 * `offset` is the unclamped translate layer the frame can't represent.
 */
export interface FramePatch {
  frame?: Partial<Frame>;
  offset?: Offset;
}

/** Engage-time geometry — pure px layout facts, shared by every mode. */
export interface Snapshot {
  readonly constraint: Rect;
  readonly rect: Box;
  readonly center0: Point;
  readonly dir: 1 | -1;
}

/** A resize along one axis: which axis, the size at engage, and the hard
 * `[min, max]` room. The static context `bounds` and `rest` share. */
export interface ResizeAxis {
  axis: Axis;
  startSize: number;
  min: number;
  max: number;
}

/** Strategy size-resolution for a resize drag (block / inline / corner).
 * The strategy's probe + options are already baked in by the I/O layer, so
 * a mode sees pure numbers. */
export interface Resizer {
  /** Soft `[lo, hi]` bounds for the live drag (rubber-band past them). */
  bounds(a: ResizeAxis): [number, number];
  /** Resting size (px) on release given the released drag, or `null` to dismiss. */
  rest(a: ResizeAxis, drag: { size: number; velocity: number }): number | null;
}

/** Move-only deps: the dismiss gate + the one live-rect DOM read. */
export interface MoveDeps {
  readonly dismissible: boolean;
  /** The live (post-drag) box rect — used only by the flick-dismiss projection. */
  liveRect(): Box;
}

/** The element side a session writes through (implemented by `overlay-dom`).
 * A session computes geometry, then renders it via these. */
export interface FrameIO {
  /** Snapshot the element into the pure parts for the engaging drag. */
  engage(): { snapshot: Snapshot; resizer: Resizer; move: MoveDeps };
  /** Live render (transition suppressed): size inline, position + offset. */
  sync(patch: FramePatch): void;
  /** Persist a frame to the channels (animated); emits `resizechange` for w/h. */
  commit(frame: Partial<Frame>): void;
  /** Restore the named channels to their engage values. */
  revert(keys: ReadonlyArray<keyof Frame>): void;
  /** Restore all channels and close the overlay. */
  dismiss(): void;
}

/** One drag session — a live per-drag handler that owns both the geometry
 * and its application: each method computes, then writes through the `io`
 * it closed over on engage. Created on engage, driven until release. */
export interface Session {
  move(p: Pointer): void;
  release(p: Pointer): void;
  cancel(): void;
}

/** Clamp with rubber-band resistance past either bound. */
export function resist(
  value: number,
  min: number,
  max: number,
  resistance = RESISTANCE,
): number {
  if (value > max) return max + (value - max) / resistance;
  if (value < min) return min - (min - value) / resistance;
  return value;
}

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
 * size and the slide-away offset (the value to write to `--overlay-dx/-dy`,
 * or `null` to remove it). Past `hi` the size rubber-bands; below `lo` the
 * size pins to `lo` and the surface slides past its edge.
 */
export function edgeDrag(args: {
  target: number;
  lo: number;
  hi: number;
  sign: number;
}): { size: number; slide: number | null } {
  const { target, lo, hi, sign } = args;
  if (target > hi)
    return { size: hi + (target - hi) / RESISTANCE, slide: null };
  if (target < lo) {
    return { size: lo, slide: -sign * (lo - Math.max(target, 0)) };
  }
  return { size: target, slide: null };
}

/**
 * Pin the opposite edge along one axis: shift the center-anchored location
 * by half the size change. Returns the rect-relative center coordinate, or
 * `null` when docked (the CSS clamp already holds that edge). The single
 * source of anchoring truth for block, inline, and corner resizes.
 */
export function anchor(args: {
  axis: Axis;
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
