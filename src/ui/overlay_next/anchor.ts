import type { IBox, IDirection } from "./box.ts";

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

export class AnchorBox implements IBox, IDirection {
  #anchor: IBox & Partial<IDirection>;

  get x() {
    return this.#anchor.x;
  }
  set x(value: number) {
    this.#anchor.x = value;
  }

  get y() {
    return this.#anchor.y;
  }
  set y(value: number) {
    this.#anchor.y = value;
  }

  get w() {
    return this.#anchor.w;
  }
  set w(value: number) {
    this.#anchor.w = value;
  }

  get h() {
    return this.#anchor.h;
  }
  set h(value: number) {
    this.#anchor.h = value;
  }

  constructor(anchor: IBox & Partial<IDirection>) {
    this.#anchor = anchor;
  }

  /**
   * The reactive `anchor()` function: the viewport coordinate of an
   * anchor line, in the context of the inset property being computed —
   * exactly the spec's resolution table. Reads the reactive rect, so
   * calling it inside a `computed`/`effect` tracks the anchor.
   *
   * The inset carries the context CSS gets for free from the property
   * the function sits in: its axis (so `center` and fractions know
   * which dimension), and its side (so `inside`/`outside` resolve).
   * `start`/`end` follow the document root's direction (the initial
   * containing block of our fixed-position channels); `self-start`/
   * `self-end` follow the anchor box's own — boxes carry it through
   * `IDirection` (`ElementBox` reads its element's computed style); a
   * box without one falls back to the document root's.
   *
   * Note the return is always a viewport coordinate: `length("bottom",
   * "top")` answers "where is the line", not "how far from the bottom"
   * — converting to a bottom-inset write is the caller's subtraction.
   */
  length(
    inset: "top" | "bottom" | "inset-block-start" | "inset-block-end",
    side: BlockSide | number,
  ): number;
  length(
    inset: "left" | "right" | "inset-inline-start" | "inset-inline-end",
    side: InlineSide | number,
  ): number;
  length(inset: Inset, side: BlockSide | InlineSide | number): number {
    const physical = resolveInset(inset);
    const block = physical === "top" || physical === "bottom";
    const lo = block ? this.y : this.x;
    const size = block ? this.h : this.w;
    return lo + this.#fraction(block, physical, side) * size;
  }

  /** A side, as a fraction of the axis measured from its top/left edge. */
  #fraction(
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
      ? this.direction === "rtl"
      : getComputedStyle(document.documentElement).direction === "rtl";
    return !block && rtl ? 1 - logical : logical;
  }

  /** The anchor's own direction — forwarded from the wrapped box, the
   * document root's when it has none. Makes `AnchorBox` itself a full
   * `IDirection` box (chains compose). */
  get direction(): "ltr" | "rtl" {
    return (
      this.#anchor.direction ??
      (getComputedStyle(document.documentElement).direction as "ltr" | "rtl")
    );
  }
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
