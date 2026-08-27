import { effect, MaybeReactive, resolve } from "@/signals/index.ts";
import { createElementRect } from "@/utilities/element-rect.ts";
import { readBox, WINDOW_BOX } from "./element-box.ts";
import type {
  BoxLike,
  ElementBox,
  IBox,
  IDirection,
} from "./element-box.ts";

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

export const SIDES = ["bottom", "top", "right", "left"] as const;
export type Side = (typeof SIDES)[number];

/** The positioning engine for a single side (cross-axis centered). */
export function computePlacement(
  self: IBox,
  anchor: IBox & Partial<IDirection>,
  side: Side,
  gap: number,
): { x: number; y: number } {
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

/** Follow an anchor on one side, reactively — writes `self.x`/`self.y`. */
export function place(
  self: ElementBox,
  anchor: IBox & Partial<IDirection>,
  _side: MaybeReactive<Side>,
  _gap: MaybeReactive<number>,
): () => void {
  return effect(() => {
    const { x, y } = computePlacement(self, anchor, resolve(_side), resolve(_gap));
    self.x = x;
    self.y = y;
  });
}

/* ================================================================== *
 * position-area — a reactive reimplementation of the CSS property.    *
 *                                                                      *
 * The anchor's four edges tile the plane into a 3×3 grid; a            *
 * `position-area` value names the region the box sits in — the full    *
 * grid vocabulary, plus position-try (flip) fallbacks and a shift-     *
 * clamp against a boundary rect.                                       *
 * ================================================================== */

/** One axis of a `position-area`, as a PHYSICAL (coordinate-space) region. */
export type AxisRegion =
  | "start"
  | "center"
  | "end"
  | "span-start"
  | "span-end"
  | "span-all";

/** A resolved `position-area` value — one physical region per axis. */
export interface Area {
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
export function resolveArea(
  area: string,
  dir: "ltr" | "rtl" = "ltr",
  selfDir: "ltr" | "rtl" = dir,
): Area {
  const tokens = area
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
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
    if (k.axis === "block") (block = k), (inline = SPAN_ALL);
    else if (k.axis === "inline") (inline = k), (block = SPAN_ALL);
    else (block = k), (inline = k);
  } else if (kws.length === 2) {
    for (const k of kws) {
      if (k.axis === "block") block = k;
      else if (k.axis === "inline") inline = k;
    }
    const ambs = kws.filter((k) => k.axis === "ambiguous");
    if (!block && !inline) (block = ambs[0]), (inline = ambs[1] ?? ambs[0]);
    else if (!block) block = ambs[0];
    else if (!inline) inline = ambs[0];
  }

  return {
    block: block ? toPhysical(block, "block", dir, selfDir) : "end",
    inline: inline ? toPhysical(inline, "inline", dir, selfDir) : "center",
  };
}

/** A region → the box's start coordinate on one axis. */
export function placeAxis(
  lo: number,
  hi: number,
  size: number,
  region: AxisRegion,
  gap = 0,
): number {
  switch (region) {
    case "start":
      return lo - size - gap;
    case "end":
      return hi + gap;
    case "span-start":
      return hi - size;
    case "span-end":
      return lo;
    default: // center | span-all
      return (lo + hi) / 2 - size / 2;
  }
}

/** The box for an {@link Area}: `placeAxis` on each axis (inline → x, block → y). */
export function placeArea(
  self: IBox,
  anchor: IBox,
  area: Area,
  gap = 0,
): { x: number; y: number } {
  return {
    x: placeAxis(anchor.x, anchor.x + anchor.w, self.w, area.inline, gap),
    y: placeAxis(anchor.y, anchor.y + anchor.h, self.h, area.block, gap),
  };
}

/** Total overflow of a `size` box at `pos` outside `boundary` (0 = fits). */
function overflow(
  pos: { x: number; y: number },
  self: IBox,
  boundary: IBox,
): number {
  return (
    Math.max(0, boundary.x - pos.x) +
    Math.max(0, boundary.y - pos.y) +
    Math.max(0, pos.x + self.w - (boundary.x + boundary.w)) +
    Math.max(0, pos.y + self.h - (boundary.y + boundary.h))
  );
}

/** position-try: pick the placement that fits `boundary` (preferred + its
 * block/inline flips); first fully inside wins, else least-overflowing. */
export function tryFallbacks(
  self: IBox,
  anchor: IBox,
  pref: Area,
  gap: number,
  boundary: IBox,
): Area {
  const candidates: Area[] = [
    pref,
    { block: flipRegion(pref.block), inline: pref.inline },
    { block: pref.block, inline: flipRegion(pref.inline) },
    { block: flipRegion(pref.block), inline: flipRegion(pref.inline) },
  ];
  let best = pref;
  let least = Infinity;
  for (const area of candidates) {
    const over = overflow(placeArea(self, anchor, area, gap), self, boundary);
    if (over === 0) return area;
    if (over < least) (least = over), (best = area);
  }
  return best;
}

function clamp(value: number, lo: number, hi: number): number {
  return hi < lo ? lo : Math.min(Math.max(value, lo), hi);
}

/** Shift the box to keep it inside `boundary` — the CROSS axis only (like
 * Floating UI). The MAIN axis (the side the box is placed on: block for
 * `start`/`end` block regions, inline for inline regions) is left to `flip`;
 * clamping it would slide the box back over the anchor. `area` names which
 * axes are "main"; without it, both clamp (a plain viewport clamp). */
export function shift(
  pos: { x: number; y: number },
  self: IBox,
  boundary: IBox,
  area?: Area,
): { x: number; y: number } {
  const blockMain = area?.block === "start" || area?.block === "end";
  const inlineMain = area?.inline === "start" || area?.inline === "end";
  return {
    x: inlineMain ? pos.x : clamp(pos.x, boundary.x, boundary.x + boundary.w - self.w),
    y: blockMain ? pos.y : clamp(pos.y, boundary.y, boundary.y + boundary.h - self.h),
  };
}

/**
 * Place `self` in a `position-area` region of `anchor`, reactively — resolve
 * the area, flip to fit `boundary` (position-try), then shift to stay inside
 * it. Writes `self.x`/`self.y`; returns the effect disposer.
 *
 * `boundary` defaults to the reactive viewport; pass any box (an `ElementBox`
 * container, a `Constraint`) for a `within`-style bound. `pinned` is the
 * tear-off follow-gate — while false the effect no-ops, so the box's own base
 * (wherever a drag left it) is the fallback; flipping it back re-pins.
 */
export function position_area(
  self: ElementBox,
  anchor: IBox & Partial<IDirection>,
  area: MaybeReactive<string>,
  gap: MaybeReactive<number> = 0,
  boundary: IBox = WINDOW_BOX,
  pinned: MaybeReactive<boolean> = true,
): () => void {
  return effect(() => {
    if (!resolve(pinned)) return;
    // Don't place until the box has a real measured size. At size 0 (just
    // opened, not yet laid out) `tryFallbacks` can't see the overflow, so it
    // would land block-end OVER the trigger before flip corrects — a visible
    // flash. The ResizeObserver re-runs this the moment it measures.
    if (self.w <= 0 || self.h <= 0) return;
    const dir = rootDirection();
    const pref = resolveArea(resolve(area), dir, self.direction ?? dir);
    const g = resolve(gap);
    const chosen = tryFallbacks(self, anchor, pref, g, boundary);
    const { x, y } = shift(placeArea(self, anchor, chosen, g), self, boundary, chosen);
    self.x = x;
    self.y = y;
  });
}

/* ================================================================== *
 * Anchor — a reactive IBox over a target the overlay follows.         *
 * ================================================================== */

export type AnchorTarget =
  | Element
  | BoxLike
  | (() => Element | BoxLike | undefined);

/**
 * A reactive `IBox` over a target: an element (its live rect, observed), a
 * `BoxLike` (a fixed or reactive box — a dot when `w`/`h` are omitted), or a
 * getter that re-points to a new target reactively (the shared nav-popover).
 * Feed it to {@link position_area} (or {@link place}) as the anchor.
 */
export class Anchor implements IBox {
  #read: () => IBox;
  #dispose: () => void = () => {};

  constructor(target: AnchorTarget) {
    if (typeof target === "function") {
      let rect: ReturnType<typeof createElementRect> | undefined;
      let tracked: Element | undefined;
      const unbind = () => {
        rect?.[Symbol.dispose]();
        rect = undefined;
        tracked = undefined;
      };
      this.#read = () => {
        const t = target();
        if (t instanceof Element) {
          if (t !== tracked) {
            unbind();
            rect = createElementRect(t);
            tracked = t;
          }
          return {
            x: rect!.left(),
            y: rect!.top(),
            w: rect!.width(),
            h: rect!.height(),
          };
        }
        // A getter may switch from an element to a box or no target. Stop
        // observing the old element as soon as it leaves the active branch.
        unbind();
        return t ? readBox(t) : { x: 0, y: 0, w: 0, h: 0 };
      };
      this.#dispose = unbind;
    } else if (target instanceof Element) {
      const rect = createElementRect(target);
      this.#read = () => ({
        x: rect.left(),
        y: rect.top(),
        w: rect.width(),
        h: rect.height(),
      });
      this.#dispose = () => rect[Symbol.dispose]();
    } else {
      this.#read = () => readBox(target);
    }
  }

  get x(): number {
    return this.#read().x;
  }
  get y(): number {
    return this.#read().y;
  }
  get w(): number {
    return this.#read().w;
  }
  get h(): number {
    return this.#read().h;
  }

  dispose(): void {
    this.#dispose();
  }
  [Symbol.dispose](): void {
    this.dispose();
  }
}
