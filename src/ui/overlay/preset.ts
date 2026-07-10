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
const RESIZE_ZONE_PX = 28;
/** Draggable: top strip that engages the x/y move. */
const MOVE_ZONE_PX = 28;
/** Resize minimums — corner grips and edge handles alike: a drawer
 * can't be dragged narrower than MIN_RESIZE_W, a sheet shorter than
 * MIN_RESIZE_H (below them the drag slides toward dismissal instead of
 * collapsing the surface to a sliver). Capped by the available room. */
const MIN_RESIZE_W = 240;
const MIN_RESIZE_H = 160;

export interface Point {
  x: number;
  y: number;
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
  rect: Required<PlainBox>;
  pointer: Point;
  dir: 1 | -1;
}): "resize" | "move" | "block" | "inline" | null {
  const { block, inline, draggable, rect, pointer, dir } = args;
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;
  const corner = block !== null && inline !== null;
  const handleRight = (inline === "end") === (dir === 1);
  const inCorner =
    corner &&
    Math.abs(pointer.x - (handleRight ? right : rect.x)) <= RESIZE_ZONE_PX &&
    Math.abs(pointer.y - (block === "end" ? bottom : rect.y)) <=
      RESIZE_ZONE_PX;
  if (inCorner) return "resize";

  // The block-start sheet's resize pill sits at top-center, so its move
  // engages only from the top-start corner (the drag dot), leaving the
  // pill free to resize.
  const topCenterResize = block === "start" && inline === null;
  const inMoveZone =
    draggable &&
    pointer.y - rect.y >= 0 &&
    pointer.y - rect.y <= MOVE_ZONE_PX &&
    (!topCenterResize ||
      Math.abs(pointer.x - (dir === 1 ? rect.x : right)) <= MOVE_ZONE_PX);
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
  rect: Required<PlainBox>;
  constraint: Required<PlainBox>;
  dir: 1 | -1;
}): { sign: number; anchorSign: number; docked: boolean } {
  const { axis, side, rect, constraint, dir } = args;
  if (axis === "block") {
    const sign = side === "end" ? 1 : -1;
    const anchorEdge = side === "start" ? rect.y + rect.h : rect.y;
    const constraintEdge =
      side === "start" ? constraint.y + constraint.h : constraint.y;
    return {
      sign,
      anchorSign: sign,
      docked: Math.abs(anchorEdge - constraintEdge) < 1,
    };
  }
  const handleRight = (side === "end") === (dir === 1);
  const anchorEdge = handleRight ? rect.x : rect.x + rect.w;
  const constraintEdge = handleRight
    ? constraint.x
    : constraint.x + constraint.w;
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
  axis: "w" | "h";
  center0: Point;
  constraint: Required<PlainBox>;
  anchorSign: number;
  startSize: number;
  size: number;
  docked: boolean;
}): number | null {
  const { axis, center0, constraint, anchorSign, startSize, size, docked } =
    args;
  if (docked) return null;
  const origin = axis === "w" ? constraint.x : constraint.y;
  const c0 = axis === "w" ? center0.x : center0.y;
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
  rect: Required<PlainBox>;
  constraint: Required<PlainBox>;
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
  rect: Required<PlainBox>,
  constraint: Required<PlainBox>,
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
        ? constraint.y + constraint.h - rect.y
        : rect.y + rect.h - constraint.y
      : anchorSign > 0
        ? constraint.x + constraint.w - rect.x
        : rect.x + rect.w - constraint.x;
  const width = axis === "inline";
  return {
    size: width ? "w" : "h",
    loc: width ? "x" : "y",
    offset: width ? "dx" : "dy",
    pointer: width ? "x" : "y",
    startSize: width ? rect.w : rect.h,
    sign,
    anchorSign,
    docked,
    lo: Math.min(width ? MIN_RESIZE_W : MIN_RESIZE_H, hi),
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
  rect: Required<PlainBox>,
  constraint: Required<PlainBox>,
  dir: 1 | -1,
): GesturePlan {
  const center0 = {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2,
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
      ? constraint.x + constraint.w - rect.x
      : rect.x + rect.w - constraint.x;
    const maxH =
      block === "end"
        ? constraint.y + constraint.h - rect.y
        : rect.y + rect.h - constraint.y;
    return {
      kind: "resize",
      rect,
      constraint,
      center0,
      session: freeSession,
      axes: [
        {
          size: "w", loc: "x", offset: "dx", pointer: "x",
          startSize: rect.w,
          sign: signX, anchorSign: signX, docked: false,
          lo: MIN_RESIZE_W, hi: maxW,
          dismisses: true, pinBelow: false,
        },
        {
          size: "h", loc: "y", offset: "dy", pointer: "y",
          startSize: rect.h,
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
    return { x: plan.rect.x + delta.x, y: plan.rect.y + delta.y };
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
  rect: Required<PlainBox>,
  velocity: Point,
  constraint: Required<PlainBox>,
): boolean {
  const px = rect.x + rect.w / 2 + velocity.x * PROJECTION_MS;
  const py = rect.y + rect.h / 2 + velocity.y * PROJECTION_MS;
  return (
    px < constraint.x ||
    px > constraint.x + constraint.w ||
    py < constraint.y ||
    py > constraint.y + constraint.h
  );
}
