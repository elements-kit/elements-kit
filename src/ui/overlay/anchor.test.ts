import { describe, expect, it } from "vitest";
import { anchor_length, PositionArea } from "./anchor.ts";
import { WINDOW_BOX } from "./box.ts";
import type { Box } from "./box.ts";

/** The window bounds every rect — read it rather than hard-coding a size. */
const W = () => WINDOW_BOX.w;
const H = () => WINDOW_BOX.h;

describe("anchor_length", () => {
  const rect: Box = { x: 100, y: 200, w: 40, h: 20 };
  it("resolves physical edges and centers", () => {
    expect(anchor_length(rect, "top", "top")).toBe(200);
    expect(anchor_length(rect, "top", "bottom")).toBe(220);
    expect(anchor_length(rect, "left", "left")).toBe(100);
    expect(anchor_length(rect, "left", "right")).toBe(140);
    expect(anchor_length(rect, "top", "center")).toBe(210);
  });
});

/** The anchor used throughout: edges at x 300→420, y 260→300. */
const ANCHOR: Box = { x: 300, y: 260, w: 120, h: 40 };

describe("PositionArea — the containing-block rect", () => {
  it("cuts the window at the anchor's edges", () => {
    // `bottom` → block-end, inline span-all: below the anchor, full width.
    expect(new PositionArea(ANCHOR, "bottom")).toMatchObject({
      x: 0,
      y: 300,
      w: W(),
      h: H() - 300,
    });
    expect(new PositionArea(ANCHOR, "top")).toMatchObject({
      x: 0,
      y: 0,
      w: W(),
      h: 260,
    });
  });

  it("center spans the anchor's own extent", () => {
    expect(new PositionArea(ANCHOR, "center")).toMatchObject({
      x: 300,
      y: 260,
      w: 120,
      h: 40,
    });
  });

  it("span regions reach from the window to the anchor's far edge", () => {
    // span-inline-start → window left → anchor's right edge.
    expect(new PositionArea(ANCHOR, "top span-left")).toMatchObject({
      x: 0,
      w: 420,
    });
    expect(new PositionArea(ANCHOR, "top span-right")).toMatchObject({
      x: 300,
      w: W() - 300,
    });
  });

  it("spans the other axis for an axis-specific keyword", () => {
    // inline-end → block span-all: full height, right of the anchor.
    expect(new PositionArea(ANCHOR, "inline-end")).toMatchObject({
      x: 420,
      y: 0,
      w: W() - 420,
      h: H(),
    });
  });

  it("flips inline logical sides in RTL, never physical ones", () => {
    document.documentElement.style.direction = "rtl";
    try {
      // inline-start in RTL is the right-hand side.
      expect(new PositionArea(ANCHOR, "inline-start")).toMatchObject({
        x: 420,
      });
      // `left` is physical — unmoved.
      expect(new PositionArea(ANCHOR, "left")).toMatchObject({ x: 0 });
    } finally {
      document.documentElement.style.direction = "";
    }
  });

  it("falls back to bottom-center for empty or malformed input", () => {
    const rect = ({ x, y, w, h }: Box) => ({ x, y, w, h });
    const fallback = rect(new PositionArea(ANCHOR, ""));
    const explicit = new PositionArea(ANCHOR, "block-end center");
    expect(fallback).toEqual(rect(explicit));
    expect(rect(new PositionArea(ANCHOR, "top garbage"))).toEqual(fallback);
    expect(rect(new PositionArea(ANCHOR, "top bottom"))).toEqual(fallback);
  });
});

describe("PositionArea — a live region", () => {
  it("tracks the anchor after creation", () => {
    const anchor: Box = { ...ANCHOR };
    const region = new PositionArea(anchor, "bottom");
    anchor.y = 500;
    expect(region.y).toBe(540);
    // Still anchor-centred on the moved anchor.
    expect(region.place({ w: 100, h: 10 })).toMatchObject({
      x: 310,
      y: 540,
    });
  });
});

describe("PositionArea — insets, for CSS", () => {
  const edges = (area: string) => {
    const { left, right, top, bottom } = new PositionArea(ANCHOR, area);
    return { left, right, top, bottom };
  };

  it("a side pins one edge on one axis", () => {
    expect(edges("bottom")).toEqual({
      left: null,
      right: null,
      top: 300,
      bottom: null,
    });
  });

  it("a corner pins one edge per axis", () => {
    expect(edges("top left")).toEqual({
      left: null,
      right: 300,
      top: null,
      bottom: 260,
    });
  });

  it("spans pin the anchor's far edge", () => {
    expect(edges("top span-left")).toMatchObject({ right: 420, left: null });
  });

  it("center pins nothing — it is anchor-center, not an inset", () => {
    expect(edges("center")).toEqual({
      left: null,
      right: null,
      top: null,
      bottom: null,
    });
  });
});

describe("Region.place — self-alignment inside the rect", () => {
  const self: Box = { x: 0, y: 0, w: 200, h: 120 };
  const place = (area: string) => new PositionArea(ANCHOR, area).place(self);

  it("outward regions hug the anchor's edge", () => {
    expect(place("bottom")).toMatchObject({ x: 260, y: 300 });
    expect(place("top")).toMatchObject({ x: 260, y: 140 });
  });

  it("span regions go flush against the anchor's far edge", () => {
    expect(place("top span-left")).toMatchObject({ x: 220 }); // 420 − 200
    expect(place("top span-right")).toMatchObject({ x: 300 });
  });

  it("centers on the anchor, not the rect, and may overflow it", () => {
    // span-all's rect is the whole window; anchor-center still centres on
    // the anchor. `center`'s rect is 120 wide — a 200-wide box overflows it.
    expect(place("bottom")).toMatchObject({ x: 260 });
    expect(place("center")).toMatchObject({ x: 260, y: 220 });
  });

  it("never resizes — a box taller than its room hugs and overflows", () => {
    // `top`: 260px of room above the anchor for a 300px box.
    const tall: Box = { x: 0, y: 0, w: 200, h: 300 };
    expect(new PositionArea(ANCHOR, "top").place(tall)).toEqual({
      x: 260,
      y: -40,
      w: 200,
      h: 300,
    });
  });
});
