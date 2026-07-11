import type { Axis, PlainBox } from "./box.ts";
import { resolveConstraint } from "./constraint.ts";
import { PROJECTION_MS, resist, Session } from "./session.ts";

/**
 * The gesture layer — a pressed `.x-handle` turned into a session.
 * `engageGesture(frame, handle)` is the whole interface: it reads the
 * handle's `data-placement`, and returns a `GestureSession` — the engaged
 * gesture AS an edit — or `undefined` when the placement names no gesture.
 * There is no zone hit-testing: the handle IS the hit-target, so its
 * placement alone names the gesture. The `Overlay` owns the plumbing
 * around it: pointer listeners delegating off its `.x-handle` children,
 * applying the session's render intent to its channels, and open/close.
 *
 * In box space every gesture is the same idea — some edges follow the
 * pointer, the rest stay pinned: an edge placement drives one size
 * dimension (the opposite edge pinned by a location shift), a corner grip
 * two, `move` moves all four edges together (a translate).
 */

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
 * Dispatch — the handle placement vocabulary.                         *
 * ------------------------------------------------------------------ */

/**
 * The block / inline handle sides a `data-placement` value encodes. Edges
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
 * The gesture kind a handle's `data-placement` names: `move` → the window
 * translate; a corner pair → the free two-axis resize; a single edge word
 * → its one-axis edge resize; anything else → `null` (not a gesture).
 */
export function placementKind(
  placement: string,
): "move" | "resize" | "block" | "inline" | null {
  if (placement === "move") return "move";
  const { block, inline } = parseResize(placement);
  if (block !== null && inline !== null) return "resize";
  if (block !== null) return "block";
  if (inline !== null) return "inline";
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
interface AxisPlan {
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

interface GesturePlan {
  kind: "move" | "resize";
  /** Driven size dimensions (resize only; move drives x/y directly). */
  axes: AxisPlan[];
  rect: Required<PlainBox>;
  constraint: Required<PlainBox>;
  center0: Point;
  /** The default feel this gesture's edit runs with. */
  feel: Session;
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
 * and the default feel the edit runs with.
 */
function planGesture(
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
    return {
      kind: "move",
      axes: [],
      rect,
      constraint,
      center0,
      feel: new Session(),
    };
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
      feel: new Session(),
      axes: [
        {
          size: "w",
          loc: "x",
          offset: "dx",
          pointer: "x",
          startSize: rect.w,
          sign: signX,
          anchorSign: signX,
          docked: false,
          lo: MIN_RESIZE_W,
          hi: maxW,
          dismisses: true,
          pinBelow: false,
        },
        {
          size: "h",
          loc: "y",
          offset: "dy",
          pointer: "y",
          startSize: rect.h,
          sign: signY,
          anchorSign: signY,
          docked: false,
          lo: MIN_RESIZE_H,
          hi: maxH,
          dismisses: false,
          pinBelow: false,
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
    feel: new EdgeSession(),
    axes: [edgeAxis(axis, side, rect, constraint, dir)],
  };
}

/** The raw driven values for a pointer delta — sizes for a resize (the
 * coupling and feel apply downstream), the box top-left for a move. */
function targetsAt(plan: GesturePlan, delta: Point): Partial<PlainBox> {
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
 * Dismissal predicates (gesture policy, applied before release).      *
 * ------------------------------------------------------------------ */

/** A shrink-projected flick past a dismissing axis's minimum. */
function shouldDismissResize(
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
function projectedOutOfBounds(
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

/* ------------------------------------------------------------------ *
 * The gesture session — an engaged pointer's edit.                    *
 * ------------------------------------------------------------------ */

/** Render intent for one live gesture frame. `width`/`height` pin the
 * element inline (instant); `x`/`y` are location-channel values
 * (channel space, px); `dx`/`dy` are the transient deltas — a number
 * writes, `null` clears. */
export interface GestureRender {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  dx?: number | null;
  dy?: number | null;
}

/**
 * The markup gesture AS a session — one engaged pointer's edit. Owns
 * the plan (which dimensions the pointer drives and their rooms), the
 * translation from pointer deltas to raw targets (`move`), the render
 * mapping the overlay applies (`render`/`place`), and the dismissal
 * verdict (`shouldDismiss`). The FEEL delegates to the gesture's
 * default (edge slide / free resize) or the custom session supplied by
 * `Overlay.gestureSession()` — its `during`/`rest` run inside this
 * episode.
 */
export class GestureSession extends Session {
  readonly kind: "move" | "resize";
  readonly #plan: GesturePlan;
  readonly #feel: Session;

  constructor(plan: GesturePlan, custom?: Session) {
    super();
    this.kind = plan.kind;
    this.#plan = plan;
    this.#feel = custom ?? plan.feel;
  }

  override during(
    value: number,
    axis: Axis,
    bounds: readonly [number, number],
  ): number {
    return this.#feel.during(value, axis, bounds);
  }

  override rest(
    value: number,
    velocity: number,
    axis: Axis,
    bounds: readonly [number, number],
  ): number | null {
    return this.#feel.rest(value, velocity, axis, bounds);
  }

  /** Raw driven values for a pointer delta — sizes for a resize, the
   * box top-left for a move. */
  move(delta: Point): Partial<PlainBox> {
    return targetsAt(this.#plan, delta);
  }

  /** The gesture's room for a driven size dimension — `undefined` for
   * anything the plan doesn't drive. */
  roomFor(axis: Axis): [number, number] | undefined {
    if (this.#plan.kind !== "resize" || (axis !== "w" && axis !== "h")) {
      return undefined;
    }
    const a = this.#plan.axes.find((a) => a.size === axis);
    return a ? [a.lo, a.hi] : undefined;
  }

  /** Live render mapping: sizes pin inline; the opposite edge couples
   * through the location channels; overshoot past the room — and the
   * below-minimum dismiss preview — ride the unclamped deltas (the
   * committed channels are CSS-clamped, so rubber must live on the
   * delta layer). A move rides the deltas entirely. */
  render(box: Partial<PlainBox>): GestureRender {
    const plan = this.#plan;
    const out: GestureRender = {};
    if (plan.kind === "move") {
      if (box.x !== undefined) out.dx = box.x - plan.rect.x;
      if (box.y !== undefined) out.dy = box.y - plan.rect.y;
      return out;
    }
    for (const a of plan.axes) {
      const v = box[a.size];
      if (v === undefined) continue;
      let size: number;
      let slide: number | null;
      if (v > a.hi) {
        // Past the room the box cannot grow — the size pins and the
        // resisted overshoot translates the whole surface instead.
        size = a.hi;
        slide = a.sign * (v - a.hi);
      } else if (v < a.lo && a.pinBelow) {
        size = a.lo;
        slide = -a.sign * (a.lo - Math.max(v, 0));
      } else {
        size = v;
        slide = null;
      }
      if (a.size === "w") out.width = size;
      else out.height = size;
      const loc = anchor({
        axis: a.size,
        center0: plan.center0,
        constraint: plan.constraint,
        anchorSign: a.anchorSign,
        startSize: a.startSize,
        size,
        docked: a.docked,
      });
      if (loc !== null) out[a.loc] = loc;
      out[a.offset] = slide;
    }
    return out;
  }

  /** Committed locations for the rested sizes — pins the opposite edge
   * exactly like the live drag. Empty for a move. */
  place(box: Partial<PlainBox>): { x?: number; y?: number } {
    const out: { x?: number; y?: number } = {};
    if (this.#plan.kind !== "resize") return out;
    for (const a of this.#plan.axes) {
      const size = box[a.size];
      if (size === undefined) continue;
      const loc = anchor({
        axis: a.size,
        center0: this.#plan.center0,
        constraint: this.#plan.constraint,
        anchorSign: a.anchorSign,
        startSize: a.startSize,
        size,
        docked: a.docked,
      });
      if (loc !== null) out[a.loc] = loc;
    }
    return out;
  }

  /** Dismissal policy, applied before release: a flicked move whose
   * projected center leaves the constraint, or a shrink-projected
   * flick past a dismissing axis's minimum. */
  shouldDismiss(
    rect: Required<PlainBox>,
    delta: Point,
    velocity: Point,
  ): boolean {
    if (this.#plan.kind === "move") {
      return projectedOutOfBounds(rect, velocity, this.#plan.constraint);
    }
    return shouldDismissResize(this.#plan, delta, velocity, 0.5);
  }
}

/**
 * The gesture layer's single entry: reads the pressed handle's
 * `data-placement`, measures the FRAME it drives, and returns the engaged
 * gesture as a session ready for `begin()` — or `undefined` when the
 * placement names no gesture. The handle is the hit-target, so its
 * placement alone names the gesture (no zone hit-testing). `custom`
 * supplies a replacement feel once the gesture kind is known (the
 * `Overlay.gestureSession()` hook).
 */
export function engageGesture(
  frame: HTMLElement,
  handle: HTMLElement,
  custom?: (kind: "move" | "resize") => Session | undefined,
): GestureSession | undefined {
  const placement = handle.getAttribute("data-placement") ?? "";
  const kind = placementKind(placement);
  if (!kind) return undefined;
  const parsed = parseResize(placement);
  const r = frame.getBoundingClientRect();
  const rect = { x: r.left, y: r.top, w: r.width, h: r.height };
  const dir = getComputedStyle(frame).direction === "rtl" ? -1 : 1;
  const plan = planGesture(kind, parsed, rect, resolveConstraint(frame), dir);
  return new GestureSession(plan, custom?.(plan.kind));
}
