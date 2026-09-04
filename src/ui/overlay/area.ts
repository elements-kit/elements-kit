import { signal } from "@/signals";
import type { Box, ReadonlyBox } from "./box.ts";

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

/**
 * Somewhere a box may go: a semi-bounded plane, each axis pinned or free.
 * `place` is the only operation: it never writes, so the caller picks which
 * channels to take — `box.x = region.place(box).x` moves one axis and leaves
 * the rest. The box is placed as given: one larger than its room overflows
 * rather than shrinks, as CSS does.
 *
 * The four insets read back as CSS would want them: the pinned edge's
 * coordinate, `null` for the other three (`auto`). A centred axis is not an
 * inset — both its edges are `null`.
 */
export interface Region {
  readonly left: number | null;
  readonly right: number | null;
  readonly top: number | null;
  readonly bottom: number | null;
  place(box: ReadonlyBox): Box;
}

/** One axis of a {@link Region.place}: where a box `n` long, currently at
 * `own`, starts once `pin` is honoured. */
export function placeAxis(pin: Pin, own: number, n: number): number {
  if (!pin) return own;
  if (pin.align === "start") return pin.at;
  if (pin.align === "end") return pin.at - n;
  return pin.at - n / 2;
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

  place(box: ReadonlyBox): Box {
    return {
      x: placeAxis(this.#x(), box.x, box.w),
      y: placeAxis(this.#y(), box.y, box.h),
      w: box.w,
      h: box.h,
    };
  }
}
