import { WINDOW_BOX } from "./box.ts";
import type { Box, IDirection, ReadonlyBox } from "./box.ts";

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
 * `position-area` value names the region the box sits in. `area_box`     *
 * resolves one to the containing block — the rect alone; `position_area` *
 * then aligns the box inside it.                                         *
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

/** The full `position-area` keyword grammar → axis + physical region. */
const KEYWORDS: Record<string, Keyword> = {
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
    const keyword = KEYWORDS[token];
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

/** One axis of the position-area containing block, as `[lo, hi]` viewport
 * coordinates. The anchor's two edges cut `[bLo, bHi]` into before/over/after. */
function axisSpan(
  lo: number,
  hi: number,
  bLo: number,
  bHi: number,
  region: AxisRegion,
): [number, number] {
  switch (region) {
    case "start":
      return [bLo, lo];
    case "end":
      return [hi, bHi];
    case "center":
      return [lo, hi];
    case "span-start":
      return [bLo, hi];
    case "span-end":
      return [lo, bHi];
    default: // span-all
      return [bLo, bHi];
  }
}

/**
 * The CSS `position-area` containing block: the region of the viewport an
 * overlay anchored to `anchor` may occupy. Nothing is placed or written —
 * this is the rect alone. Align a box inside it with {@link position_area}, or
 * use it as a max-size to let the box shrink near an edge.
 *
 * Bounded by the window. A tighter bound (a `Constraint`, a scroll container)
 * is an intersection with the returned rect, so it composes afterwards rather
 * than being a parameter here.
 *
 * There is no gap parameter, for the same reason CSS has none: the offset off
 * the anchor is the overlay's own `margin`.
 *
 * Pure, but reads both boxes' reactive geometry, so calling it inside an
 * `effect` tracks the anchor.
 */
export function area_box(anchor: ReadonlyBox, area: string): Box {
  return areaBox(anchor, resolveArea(area, rootDirection()));
}

/** {@link area_box} on an already-resolved area — the shared core, so a
 * placement parses the value once rather than once per half. */
function areaBox(anchor: ReadonlyBox, { block, inline }: Area): Box {
  const [x0, x1] = axisSpan(
    anchor.x,
    anchor.x + anchor.w,
    WINDOW_BOX.x,
    WINDOW_BOX.x + WINDOW_BOX.w,
    inline,
  );
  const [y0, y1] = axisSpan(
    anchor.y,
    anchor.y + anchor.h,
    WINDOW_BOX.y,
    WINDOW_BOX.y + WINDOW_BOX.h,
    block,
  );
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** A region's default self-alignment inside its rect, as a fraction — outward
 * regions hug the anchor's edge, spans go flush against it. `null` is
 * `anchor-center`, which references the anchor rather than the rect. */
function alignFraction(region: AxisRegion): number | null {
  switch (region) {
    case "start":
    case "span-start":
      return 1;
    case "end":
    case "span-end":
      return 0;
    default: // center | span-all
      return null;
  }
}

/** One axis of {@link position_area}. */
function alignAxis(
  rLo: number,
  rSize: number,
  aLo: number,
  aSize: number,
  size: number,
  region: AxisRegion,
): number {
  const f = alignFraction(region);
  // anchor-center: centred on the ANCHOR, not the rect, and free to overflow
  // it — matching CSS, which reacts to that overflow instead of clamping.
  return f === null ? aLo + aSize / 2 - size / 2 : rLo + (rSize - size) * f;
}

/**
 * Place `self` in a `position-area` region of `anchor`: {@link area_box} for
 * the containing block, then the region's default self-alignment inside it —
 * outward regions hug the anchor, spans go flush, center is `anchor-center`.
 * Returns the box's top-left; writing it is the caller's.
 *
 * Pure, but reads both boxes' reactive geometry, so calling it inside an
 * `effect` tracks the anchor.
 */
export function position_area(
  self: ReadonlyBox,
  anchor: ReadonlyBox,
  area: string,
): { x: number; y: number } {
  const resolved = resolveArea(area, rootDirection());
  const box = areaBox(anchor, resolved);
  const { block, inline } = resolved;
  return {
    x: alignAxis(box.x, box.w, anchor.x, anchor.w, self.w, inline),
    y: alignAxis(box.y, box.h, anchor.y, anchor.h, self.h, block),
  };
}
