import { effect, MaybeReactive, resolve } from "@/signals/index.ts";
import type { ElementBox, IBox, IDirection } from "./box.ts";

/**
 * The anchor-side vocabulary of the CSS `anchor()` function,
 * reimplemented reactively — the JS tier speaks the same words as the
 * native one, so positioning code reads identically in both:
 *
 *   overlay.y = a.length("top", "bottom")   ≡   top: anchor(bottom)
 *
 * https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/anchor#anchor-side
 *
 * Deliberate differences from CSS:
 * - `<percentage>` is a 0–1 fraction (`0.25`, not `25%`), like every
 *   other fraction in the library.
 * - No fallback parameter — the overloads make invalid inset/side pairs
 *   unrepresentable, which is what the CSS fallback exists for.
 * - Horizontal writing modes only: the block axis always starts at the
 *   top; only the inline axis consults `direction`.
 */

/** Sides valid in a block-axis inset (`top` / `bottom`). */
export type BlockSide =
  | "top"
  | "bottom"
  | "inside"
  | "outside"
  | "start"
  | "end"
  | "self-start"
  | "self-end"
  | "center";

/** Sides valid in an inline-axis inset (`left` / `right`). */
export type InlineSide =
  | "left"
  | "right"
  | "inside"
  | "outside"
  | "start"
  | "end"
  | "self-start"
  | "self-end"
  | "center";

/** The physical inset longhands. */
export type PhysicalInset = "top" | "right" | "bottom" | "left";

/** Every inset property `anchor()` may sit in: the physical longhands
 * plus the logical ones, which resolve to a physical side through the
 * containing block's direction. The shorthands (`inset`, `inset-block`,
 * `inset-inline`) are NOT contexts — they distribute their values to
 * these longhands, where each `anchor()` resolves. */
export type Inset =
  | PhysicalInset
  | "inset-block-start"
  | "inset-block-end"
  | "inset-inline-start"
  | "inset-inline-end";

/**
 * The reactive `anchor()` function: the viewport coordinate of an anchor
 * line on `box`, in the context of the inset property being computed —
 * exactly the spec's resolution table. Reads the box's reactive geometry,
 * so calling it inside a `computed`/`effect` tracks the anchor.
 *
 * The inset carries the context CSS gets for free from the property the
 * function sits in: its axis (so `center` and fractions know which
 * dimension), and its side (so `inside`/`outside` resolve). `start`/`end`
 * follow the document root's direction (the initial containing block of our
 * fixed-position channels); `self-start`/`self-end` follow the box's own —
 * boxes carry it through `IDirection` (`ElementBox` reads its element's
 * computed style); a box without one falls back to the document root's.
 *
 * The return is always a viewport coordinate: `anchorLength(box, "bottom",
 * "top")` answers "where is the line", not "how far from the bottom" —
 * converting to a bottom-inset write is the caller's subtraction.
 *
 * The type-safe surface is {@link Anchorable.length}; this raw form accepts
 * the widened union so a box can delegate to it without a cast.
 */
export function anchor_length(
  box: IBox & Partial<IDirection>,
  inset: Inset,
  side: BlockSide | InlineSide | number,
): number {
  const physical = resolveInset(inset);
  const block = physical === "top" || physical === "bottom";
  const lo = block ? box.y : box.x;
  const size = block ? box.h : box.w;
  return lo + fraction(box, block, physical, side) * size;
}

/** A side, as a fraction of the axis measured from its top/left edge. */
function fraction(
  box: Partial<IDirection>,
  block: boolean,
  inset: PhysicalInset,
  side: BlockSide | InlineSide | number,
): number {
  switch (side) {
    case "top":
    case "left":
      return 0;
    case "bottom":
    case "right":
      return 1;
    case "inside":
      return inset === "top" || inset === "left" ? 0 : 1;
    case "outside":
      return inset === "top" || inset === "left" ? 1 : 0;
    case "center":
      return 0.5;
  }

  const logical =
    typeof side === "number" ? side : side.endsWith("end") ? 1 : 0;
  const selfSide = side === "self-start" || side === "self-end";
  const rtl = selfSide
    ? (box.direction ?? rootDirection()) === "rtl"
    : rootDirection() === "rtl";
  return !block && rtl ? 1 - logical : logical;
}

/** The document root's direction — the initial containing block of our
 * fixed-position channels, and the fallback when a box has no own. */
function rootDirection(): "ltr" | "rtl" {
  return getComputedStyle(document.documentElement).direction === "rtl"
    ? "rtl"
    : "ltr";
}

/** A logical inset longhand → its physical side, through the containing
 * block's direction (the initial containing block here — horizontal
 * writing modes, so only the inline axis flips). */
function resolveInset(inset: Inset): PhysicalInset {
  switch (inset) {
    case "inset-block-start":
      return "top";
    case "inset-block-end":
      return "bottom";
    case "inset-inline-start":
      return getComputedStyle(document.documentElement).direction === "rtl"
        ? "right"
        : "left";
    case "inset-inline-end":
      return getComputedStyle(document.documentElement).direction === "rtl"
        ? "left"
        : "right";
    default:
      return inset;
  }
}

export const SIDES = ["bottom", "top", "right", "left"] as const;
export type Side = (typeof SIDES)[number];

/** The whole positioning engine: the anchor vocabulary → a viewport box.
 * Reads reactive fields (anchor lines, overlay size), so calling it in an
 * `effect` re-runs whenever the anchor moves or the panel resizes. */
export function computePlacement(
  self: ElementBox,
  anchor: ElementBox,
  side: Side,
  gap: number,
) {
  switch (side) {
    case "bottom":
      return {
        x: anchor_length(anchor, "left", "center") - self.w / 2,
        y: anchor_length(anchor, "top", "bottom") + gap,
      };
    case "top":
      return {
        x: anchor_length(anchor, "left", "center") - self.w / 2,
        y: anchor_length(anchor, "top", "top") - gap - self.h,
      };
    case "right":
      return {
        x: anchor_length(anchor, "left", "right") + gap,
        y: anchor_length(anchor, "top", "center") - self.h / 2,
      };
    case "left":
      return {
        x: anchor_length(anchor, "left", "left") - gap - self.w,
        y: anchor_length(anchor, "top", "center") - self.h / 2,
      };
  }
}

export function place(
  self: ElementBox,
  anchor: ElementBox,
  _side: MaybeReactive<Side>,
  _gap: MaybeReactive<number>,
): () => void {
  return effect(() => {
    const side = resolve(_side);
    const gap = resolve(_gap);
    const { x, y } = computePlacement(self, anchor, side, gap);
    self.x = x;
    self.y = y;
  });
}
