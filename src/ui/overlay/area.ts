import { signal } from "@/signals";
import type { Point, ReadonlyBox } from "./box.ts";

/** Which of a box's points sits on a pin: its lo edge, hi edge, or middle. */
export type Align = "start" | "end" | "center";

/** One axis of a region: a coordinate and the box point that sits on it,
 * or `null` — the axis is free and the box keeps its own coordinate. */
export type Pin = { readonly align: Align; readonly at: number } | null;

/** A pinned block edge and its coordinate. */
type BlockEdge =
  | { top: number; bottom?: never }
  | { bottom: number; top?: never };
/** A pinned inline edge and its coordinate. */
type InlineEdge =
  | { left: number; right?: never }
  | { right: number; left?: never };
/** Neither block edge pinned — the axis is free. */
type NoBlock = { top?: never; bottom?: never };
/** Neither inline edge pinned — the axis is free. */
type NoInline = { left?: never; right?: never };

/**
 * A corner (one edge pinned on each axis: a tooltip, a popover) or a side
 * (one edge, the other axis free: a bottom sheet). Never empty, and never
 * both edges of one axis.
 */
export type Boundary =
  | (BlockEdge & InlineEdge) // corner
  | (BlockEdge & NoInline) // side
  | (NoBlock & InlineEdge); // side

/** Horizontal origin keyword, as CSS spells it. */
export type OriginX = "left" | "center" | "right";
/** The vertical one. */
export type OriginY = "top" | "center" | "bottom";

/** Which point of a box lands on its position. A `transform-origin`. */
export interface Origin {
  readonly x: OriginX;
  readonly y: OriginY;
}

/** Has an origin. */
export interface IOrigin {
  readonly origin: Origin;
}

/**
 * Somewhere a box may go: each axis pinned or free. `place` never writes, so
 * the caller takes the channels it wants, and never returns a size, so a box
 * larger than its room overflows rather than shrinks, as CSS does.
 *
 * `x`/`y` are the pin lines, `origin` the box point landing on them — the
 * pair places a box without measuring it. A free axis has no pin (`null`).
 */
export interface Region extends IOrigin {
  readonly x: number | null;
  readonly y: number | null;
  place(box: ReadonlyBox): Point;
}

/** Where a box `n` long starts on a pinned axis. */
export function placePinned(pin: NonNullable<Pin>, n: number): number {
  if (pin.align === "start") return pin.at;
  if (pin.align === "end") return pin.at - n;
  return pin.at - n / 2;
}

/** One axis of {@link Region.place}: pinned, or `own` if free. */
export function placeAxis(pin: Pin, own: number, n: number): number {
  return pin ? placePinned(pin, n) : own;
}

/** The box point a pin lands. Physical: direction is resolved before a pin
 * exists, so `left` is left in RTL. A free axis lands the near edge. */
export function originX(pin: Pin): OriginX {
  if (!pin) return "left";
  return pin.align === "start" ? "left" : pin.align === "end" ? "right" : "center";
}
export function originY(pin: Pin): OriginY {
  if (!pin) return "top";
  return pin.align === "start" ? "top" : pin.align === "end" ? "bottom" : "center";
}

/** The inset a pin yields on one edge: its coordinate if it pins that edge. */
export function inset(pin: Pin, edge: "start" | "end"): number | null {
  return pin?.align === edge ? pin.at : null;
}

/**
 * A {@link Region} driven by writes — for gestures, where the box grows away
 * from the edge the user is not dragging. Assigning an inset pins that edge
 * and releases its opposite; assigning `null` frees the axis.
 */
export class MutableRegion implements Region {
  #x = signal<Pin>(null);
  #y = signal<Pin>(null);

  constructor(boundary: Boundary) {
    const { left, right, top, bottom } = boundary;
    if (left !== undefined) this.left = left;
    if (right !== undefined) this.right = right;
    if (top !== undefined) this.top = top;
    if (bottom !== undefined) this.bottom = bottom;
  }

  /** The pin line on each axis — `null` where the axis is free. */
  get x() {
    return this.#x()?.at ?? null;
  }
  get y() {
    return this.#y()?.at ?? null;
  }

  /** The box point that lands on ({@link x}, {@link y}). */
  get origin(): Origin {
    return { x: originX(this.#x()), y: originY(this.#y()) };
  }

  get left() {
    return inset(this.#x(), "start");
  }
  get right() {
    return inset(this.#x(), "end");
  }
  get top() {
    return inset(this.#y(), "start");
  }
  get bottom() {
    return inset(this.#y(), "end");
  }

  set left(v: number | null) {
    this.#x(v === null ? null : { align: "start", at: v });
  }
  set right(v: number | null) {
    this.#x(v === null ? null : { align: "end", at: v });
  }
  set top(v: number | null) {
    this.#y(v === null ? null : { align: "start", at: v });
  }
  set bottom(v: number | null) {
    this.#y(v === null ? null : { align: "end", at: v });
  }

  place(box: ReadonlyBox): Point {
    return {
      x: placeAxis(this.#x(), box.x, box.w),
      y: placeAxis(this.#y(), box.y, box.h),
    };
  }
}
