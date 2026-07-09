import type { PlainBox } from "./box.ts";
import { PROJECTION_MS, resist, Session } from "./session.ts";

/**
 * The markup gesture preset's LOGIC — pure helpers behind `data-resize`
 * / `data-draggable`: the attribute vocabulary, the engagement zones,
 * and the per-gesture plan (which axes the pointer drives, their rooms,
 * signs, and coupling). The `Overlay` owns the pointer plumbing and
 * drives its OWN edit lifecycle (`begin`/`set`/`release`/`cancel`) from
 * these — the preset's physics are the same `Session` machinery custom
 * handles use.
 *
 * In box space every gesture is the same idea — some edges follow the
 * pointer, the rest stay pinned: an edge word drives one size dimension
 * (the opposite edge pinned by a location shift), a corner grip two,
 * `data-draggable` moves all four edges together (a translate).
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
 * Edge math.                                                          *
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
 * Pin the opposite edge along one axis: shift the center-anchored location
 * by half the size change. Returns the rect-relative center coordinate
 * (channel space), or `null` when docked (the CSS clamp already holds that
 * edge). The single source of anchoring truth for block, inline, and
 * corner resizes.
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
 * The gesture plan — what an engaged pointer drives.                  *
 * ------------------------------------------------------------------ */

/** One driven size dimension of a resize gesture. */
export interface AxisPlan {
  /** The channel keys this dimension writes. */
  size: "w" | "h";
  loc: "x" | "y";
  offset: "dx" | "dy";
  /** Pointer axis driving it. */
  pointer: keyof Point;
  axisName: "width" | "height";
  startSize: number;
  /** Growth sign (handle grows toward the pointer) + anchoring. */
  sign: number;
  anchorSign: number;
  docked: boolean;
  /** Hard room `[lo, hi]` — hi runs from the anchored edge to the
   * constraint (past it the CSS clamp would shove the anchored edge). */
  lo: number;
  hi: number;
  /** May a shrink-flick past `lo` dismiss — false for the corner's free
   * height clamp. */
  dismisses: boolean;
  /** Below `lo`: pin the size and slide toward the edge 1:1 (edge
   * handles — the dismiss preview) or render the resisted value
   * (corner). */
  pinBelow: boolean;
}

export interface GesturePlan {
  kind: "move" | "resize";
  /** Driven size dimensions (resize only; move drives x/y directly). */
  axes: AxisPlan[];
  rect: Box;
  constraint: Rect;
  center0: Point;
  /** The edit physics for this gesture. */
  session: Session;
}

/** Edge handles pass raw values below `lo` through `during` — the
 * Overlay's render mapping pins the size there and slides the surface
 * 1:1 toward its edge (the dismiss preview must track the finger). */
class EdgeSession extends Session {
  override during(
    value: number,
    _axis: "x" | "y" | "w" | "h",
    bounds: readonly [number, number],
  ): number {
    return value < bounds[0] ? value : resist(value, bounds[0], bounds[1]);
  }
}

const edgeSession = new EdgeSession();
const freeSession = new Session();

function edgeAxis(
  axis: "block" | "inline",
  side: "start" | "end",
  rect: Box,
  constraint: Rect,
  dir: 1 | -1,
): AxisPlan {
  const { sign, anchorSign, docked } = edgeSetup({
    axis,
    side,
    rect,
    constraint,
    dir,
  });
  const hi =
    axis === "block"
      ? anchorSign > 0
        ? constraint.top + constraint.height - rect.top
        : rect.bottom - constraint.top
      : anchorSign > 0
        ? constraint.left + constraint.width - rect.left
        : rect.right - constraint.left;
  const width = axis === "inline";
  return {
    size: width ? "w" : "h",
    loc: width ? "x" : "y",
    offset: width ? "dx" : "dy",
    pointer: width ? "x" : "y",
    axisName: width ? "width" : "height",
    startSize: width ? rect.width : rect.height,
    sign,
    anchorSign,
    docked,
    lo: 0,
    hi,
    dismisses: true,
    pinBelow: true,
  };
}

/**
 * Builds the plan for an engaged gesture: which size dimensions the
 * pointer drives (edge word = one, corner grip = two; asymmetric — the
 * corner's width alone decides dismissal, its height is a free clamp)
 * and the physics session the edit runs with.
 */
export function planGesture(
  kind: "block" | "inline" | "resize" | "move",
  parsed: { block: "start" | "end" | null; inline: "start" | "end" | null },
  rect: Box,
  constraint: Rect,
  dir: 1 | -1,
): GesturePlan {
  const center0 = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  if (kind === "move") {
    return { kind: "move", axes: [], rect, constraint, center0, session: freeSession };
  }
  if (kind === "resize") {
    const block = parsed.block!;
    const inline = parsed.inline!;
    const signX = (inline === "end" ? 1 : -1) * dir;
    const signY = block === "end" ? 1 : -1;
    const handleRight = (inline === "end") === (dir === 1);
    const maxW = handleRight
      ? constraint.left + constraint.width - rect.left
      : rect.right - constraint.left;
    const maxH =
      block === "end"
        ? constraint.top + constraint.height - rect.top
        : rect.bottom - constraint.top;
    return {
      kind: "resize",
      rect,
      constraint,
      center0,
      session: freeSession,
      axes: [
        {
          size: "w", loc: "x", offset: "dx", pointer: "x", axisName: "width",
          startSize: rect.width,
          sign: signX, anchorSign: signX, docked: false,
          lo: MIN_RESIZE_W, hi: maxW,
          dismisses: true, pinBelow: false,
        },
        {
          size: "h", loc: "y", offset: "dy", pointer: "y", axisName: "height",
          startSize: rect.height,
          sign: signY, anchorSign: signY, docked: false,
          lo: MIN_RESIZE_H, hi: maxH,
          dismisses: false, pinBelow: false,
        },
      ],
    };
  }
  const axis = kind === "block" ? "block" : "inline";
  const side = kind === "block" ? parsed.block! : parsed.inline!;
  return {
    kind: "resize",
    rect,
    constraint,
    center0,
    session: edgeSession,
    axes: [edgeAxis(axis, side, rect, constraint, dir)],
  };
}

/** The raw driven values for a pointer delta — sizes for a resize (the
 * coupling and physics apply downstream), the box top-left for a move. */
export function targetsAt(plan: GesturePlan, delta: Point): Partial<PlainBox> {
  if (plan.kind === "move") {
    return { x: plan.rect.left + delta.x, y: plan.rect.top + delta.y };
  }
  const out: Partial<PlainBox> = {};
  for (const a of plan.axes) {
    out[a.size] = a.startSize + a.sign * delta[a.pointer];
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Dismissal predicates (preset policy, applied before release).       *
 * ------------------------------------------------------------------ */

/** A shrink-projected flick past a dismissing axis's minimum. */
export function shouldDismissResize(
  plan: GesturePlan,
  delta: Point,
  velocity: Point,
  velocityThreshold: number,
): boolean {
  for (const a of plan.axes) {
    if (!a.dismisses) continue;
    const target = a.startSize + a.sign * delta[a.pointer];
    const v = -a.sign * velocity[a.pointer]; // positive = shrinking
    const projected = target - v * PROJECTION_MS;
    if (projected < a.lo / 2) return true;
    if (target < a.lo && v > velocityThreshold) return true;
  }
  return false;
}

/** Whether a flicked move's projected center leaves the constraint. */
export function projectedOutOfBounds(
  rect: Box,
  velocity: Point,
  constraint: Rect,
): boolean {
  const px = rect.left + rect.width / 2 + velocity.x * PROJECTION_MS;
  const py = rect.top + rect.height / 2 + velocity.y * PROJECTION_MS;
  return (
    px < constraint.left ||
    px > constraint.left + constraint.width ||
    py < constraint.top ||
    py > constraint.top + constraint.height
  );
}
