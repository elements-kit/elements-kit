import { type Computed, computed, reactive } from "@/signals";
import { originX, originY, placePinned } from "./area.ts";
import type { Origin, Pin, Region } from "./area.ts";
import type { Box, IDirection, Point, ReadonlyBox } from "./box.ts";

/**
 * The anchor-side vocabulary of the CSS `anchor()` function, reimplemented
 * reactively — the JS tier speaks the same words as the native one:
 *
 *   overlay.y = anchor_length(a, "top", "bottom")   ≡   top: anchor(bottom)
 *
 * Horizontal writing modes only: the block axis always starts at the top;
 * only the inline axis consults `direction`.
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

/** Every inset property `anchor()` may sit in. */
export type Inset =
  | PhysicalInset
  | "inset-block-start"
  | "inset-block-end"
  | "inset-inline-start"
  | "inset-inline-end";

/**
 * The reactive `anchor()` function: the viewport coordinate of an anchor line
 * on `box`, in the context of the inset property being computed. Reads the
 * box's reactive geometry, so calling it inside an `effect` tracks the anchor.
 */
export function anchor_length(
  box: Box & Partial<IDirection>,
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

/** The document root's direction — the fallback when a box has no own. */
function rootDirection(): "ltr" | "rtl" {
  return getComputedStyle(document.documentElement).direction === "rtl"
    ? "rtl"
    : "ltr";
}

/** A logical inset longhand → its physical side, through the containing
 * block's direction (horizontal writing modes — only inline flips). */
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

/* ====================================================================== *
 * position-area — a reactive reimplementation of the CSS property.       *
 *                                                                        *
 * The anchor's four edges tile the plane into a 3×3 grid; a              *
 * `position-area` value names the region the box sits in. `PositionArea` *
 * is that region, live: the containing block, plus the region's default  *
 * self-alignment as `place`.                                             *
 * ====================================================================== */

/** One axis of a `position-area`, as a PHYSICAL (coordinate-space) region. */
type AxisRegion =
  | "start"
  | "center"
  | "end"
  | "span-start"
  | "span-end"
  | "span-all";

/** A resolved `position-area` value — one physical region per axis. */
interface Area {
  block: AxisRegion;
  inline: AxisRegion;
}

interface Keyword {
  axis: "block" | "inline" | "ambiguous";
  region: AxisRegion;
  physical: boolean;
  self: boolean;
}

const B = (region: AxisRegion, physical = false): Keyword => ({
  axis: "block",
  region,
  physical,
  self: false,
});
const I = (region: AxisRegion, physical = false): Keyword => ({
  axis: "inline",
  region,
  physical,
  self: false,
});
const A = (region: AxisRegion, self = false): Keyword => ({
  axis: "ambiguous",
  region,
  physical: false,
  self,
});

/** Keywords naming the block axis. */
type BlockKeyword =
  | "top"
  | "bottom"
  | "span-top"
  | "span-bottom"
  | "block-start"
  | "block-end"
  | "span-block-start"
  | "span-block-end"
  | "y-start"
  | "y-end"
  | "span-y-start"
  | "span-y-end";

/** Keywords naming the inline axis. */
type InlineKeyword =
  | "left"
  | "right"
  | "span-left"
  | "span-right"
  | "inline-start"
  | "inline-end"
  | "span-inline-start"
  | "span-inline-end"
  | "x-start"
  | "x-end"
  | "span-x-start"
  | "span-x-end";

/** Keywords naming no axis — each takes whichever one is still free. */
type AmbiguousKeyword =
  | "center"
  | "span-all"
  | "start"
  | "end"
  | "span-start"
  | "span-end"
  | "self-start"
  | "self-end"
  | "span-self-start"
  | "span-self-end";

type AreaKeyword = BlockKeyword | InlineKeyword | AmbiguousKeyword;

/** Two keywords, in either order — `position-area` is unordered. */
type Unordered<A extends string, B extends string> = `${A} ${B}` | `${B} ${A}`;

/**
 * A valid `position-area` value: one keyword, or two naming different axes.
 * Two of the same explicit axis (`top bottom`, `left right`) is not a value —
 * {@link resolveArea} resolves anything invalid to the `block-end` fallback,
 * so catching it here is the difference between a compile error and a menu
 * that quietly opens on the wrong side.
 */
export type PositionAreaValue =
  | AreaKeyword
  | Unordered<BlockKeyword, InlineKeyword>
  | Unordered<BlockKeyword, AmbiguousKeyword>
  | Unordered<InlineKeyword, AmbiguousKeyword>
  | `${AmbiguousKeyword} ${AmbiguousKeyword}`;

/** The full `position-area` keyword grammar → axis + physical region. The
 * key type forces this table and {@link PositionAreaValue} to stay in step. */
const KEYWORDS: Record<AreaKeyword, Keyword> = {
  top: B("start", true),
  bottom: B("end", true),
  "span-top": B("span-start", true),
  "span-bottom": B("span-end", true),
  left: I("start", true),
  right: I("end", true),
  "span-left": I("span-start", true),
  "span-right": I("span-end", true),
  center: { axis: "ambiguous", region: "center", physical: true, self: false },
  "span-all": {
    axis: "ambiguous",
    region: "span-all",
    physical: true,
    self: false,
  },
  "block-start": B("start"),
  "block-end": B("end"),
  "span-block-start": B("span-start"),
  "span-block-end": B("span-end"),
  "y-start": B("start"),
  "y-end": B("end"),
  "span-y-start": B("span-start"),
  "span-y-end": B("span-end"),
  "inline-start": I("start"),
  "inline-end": I("end"),
  "span-inline-start": I("span-start"),
  "span-inline-end": I("span-end"),
  "x-start": I("start"),
  "x-end": I("end"),
  "span-x-start": I("span-start"),
  "span-x-end": I("span-end"),
  start: A("start"),
  end: A("end"),
  "span-start": A("span-start"),
  "span-end": A("span-end"),
  "self-start": A("start", true),
  "self-end": A("end", true),
  "span-self-start": A("span-start", true),
  "span-self-end": A("span-end", true),
};

const SPAN_ALL = KEYWORDS["span-all"];

function flipRegion(r: AxisRegion): AxisRegion {
  return r === "start"
    ? "end"
    : r === "end"
      ? "start"
      : r === "span-start"
        ? "span-end"
        : r === "span-end"
          ? "span-start"
          : r;
}

/** Resolve a keyword to a physical region: block never flips; inline flips
 * in RTL unless the keyword is physical. */
function toPhysical(
  kw: Keyword,
  axis: "block" | "inline",
  dir: "ltr" | "rtl",
  selfDir: "ltr" | "rtl",
): AxisRegion {
  const r = kw.region;
  if (r === "center" || r === "span-all" || axis === "block" || kw.physical) {
    return r;
  }
  return (kw.self ? selfDir : dir) === "rtl" ? flipRegion(r) : r;
}

/**
 * Parse a `position-area` value into a physical {@link Area}. One or two
 * keywords, order-independent; an axis-specific single keyword spans the
 * other axis, an ambiguous one applies to both. Unknown/empty → `block-end`.
 */
function resolveArea(
  area: string,
  dir: "ltr" | "rtl" = "ltr",
  selfDir: "ltr" | "rtl" = dir,
): Area {
  const tokens = area.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const fallback = (): Area => ({ block: "end", inline: "center" });
  if (tokens.length === 0 || tokens.length > 2) return fallback();

  const kws: Keyword[] = [];
  for (const token of tokens) {
    const keyword: Keyword | undefined = KEYWORDS[token as AreaKeyword];
    if (!keyword) return fallback();
    kws.push(keyword);
  }

  // Two explicit keywords for the same axis are not a valid area. Do not
  // silently let the latter win (`top bottom`, `left right`).
  const [first, second] = kws;
  if (
    first &&
    second &&
    first.axis !== "ambiguous" &&
    first.axis === second.axis
  ) {
    return fallback();
  }

  let block: Keyword | undefined;
  let inline: Keyword | undefined;

  if (kws.length === 1) {
    const k = kws[0];
    if (k.axis === "block") ((block = k), (inline = SPAN_ALL));
    else if (k.axis === "inline") ((inline = k), (block = SPAN_ALL));
    else ((block = k), (inline = k));
  } else if (kws.length === 2) {
    for (const k of kws) {
      if (k.axis === "block") block = k;
      else if (k.axis === "inline") inline = k;
    }
    const ambs = kws.filter((k) => k.axis === "ambiguous");
    if (!block && !inline) ((block = ambs[0]), (inline = ambs[1] ?? ambs[0]));
    else if (!block) block = ambs[0];
    else if (!inline) inline = ambs[0];
  }

  return {
    block: block ? toPhysical(block, "block", dir, selfDir) : "end",
    inline: inline ? toPhysical(inline, "inline", dir, selfDir) : "center",
  };
}

/**
 * The reactive `position-area` property: which of the anchor's edges a box
 * pins to, and the self-alignment that follows — outward regions hug the
 * anchor's near edge, spans its far edge, center is `anchor-center`. Not a
 * box: a pin per axis, with no geometry of its own.
 *
 * The area is assignable — reassigning re-aims the region in place, so a menu
 * can flip side without a new one. Parsed on assignment; the pins read the
 * anchor on every access, so an `effect` tracks both.
 *
 * No gap parameter, for the same reason CSS has none: the offset off the
 * anchor is the overlay's own `margin`.
 */
export class PositionArea implements Region {
  @reactive() area: PositionAreaValue;
  @reactive() anchor: ReadonlyBox & Partial<IDirection>;
  #resolved: Computed<Area>;

  constructor(
    anchor: ReadonlyBox & Partial<IDirection>,
    area: PositionAreaValue,
  ) {
    this.anchor = anchor;
    this.area = area;
    this.#resolved = computed(() =>
      resolveArea(this.area, this.anchor.direction ?? rootDirection()),
    );
  }

  get #px() {
    const a = this.anchor;
    const area = this.#resolved();
    return pinOf(area.inline, a.x, a.x + a.w);
  }
  get #py() {
    const a = this.anchor;
    const area = this.#resolved();
    return pinOf(area.block, a.y, a.y + a.h);
  }

  /** The pin lines — the viewport point {@link origin} lands on. */
  get x(): number {
    return this.#px.at;
  }
  get y(): number {
    return this.#py.at;
  }

  /** The box point landing on ({@link x}, {@link y}). Two axes, not one
   * side: a corner area pins a corner. */
  get origin(): Origin {
    return { x: originX(this.#px), y: originY(this.#py) };
  }

  /** Every axis is pinned, so only the box's size is read. */
  place(box: Pick<ReadonlyBox, "w" | "h">): Point {
    return {
      x: placePinned(this.#px, box.w),
      y: placePinned(this.#py, box.h),
    };
  }
}

/** A region's default self-alignment as a pin on the anchor's `[lo, hi]` —
 * outward regions hug the anchor's near edge, spans its far edge; `center`
 * and `span-all` are `anchor-center`, which may overflow the rect. */
function pinOf(region: AxisRegion, lo: number, hi: number): NonNullable<Pin> {
  switch (region) {
    case "start":
      return { align: "end", at: lo };
    case "span-start":
      return { align: "end", at: hi };
    case "end":
      return { align: "start", at: hi };
    case "span-end":
      return { align: "start", at: lo };
    default:
      return { align: "center", at: (lo + hi) / 2 };
  }
}
