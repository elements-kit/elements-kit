import { describe, expect, it } from "vitest";
import { anchor_length, position_area, area_box } from "./anchor.ts";
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

describe("compute_area — the containing-block rect", () => {
  it("cuts the window at the anchor's edges", () => {
    // `bottom` → block-end, inline span-all: below the anchor, full width.
    expect(area_box(ANCHOR, "bottom")).toEqual({
      x: 0,
      y: 300,
      w: W(),
      h: H() - 300,
    });
    expect(area_box(ANCHOR, "top")).toEqual({
      x: 0,
      y: 0,
      w: W(),
      h: 260,
    });
  });

  it("center spans the anchor's own extent", () => {
    expect(area_box(ANCHOR, "center")).toEqual({
      x: 300,
      y: 260,
      w: 120,
      h: 40,
    });
  });

  it("span regions reach from the window to the anchor's far edge", () => {
    // span-inline-start → window left → anchor's right edge.
    expect(area_box(ANCHOR, "top span-left")).toMatchObject({
      x: 0,
      w: 420,
    });
    expect(area_box(ANCHOR, "top span-right")).toMatchObject({
      x: 300,
      w: W() - 300,
    });
  });

  it("spans the other axis for an axis-specific keyword", () => {
    // inline-end → block span-all: full height, right of the anchor.
    expect(area_box(ANCHOR, "inline-end")).toEqual({
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
      expect(area_box(ANCHOR, "inline-start")).toMatchObject({
        x: 420,
      });
      // `left` is physical — unmoved.
      expect(area_box(ANCHOR, "left")).toMatchObject({ x: 0 });
    } finally {
      document.documentElement.style.direction = "";
    }
  });

  it("falls back to bottom-center for empty or malformed input", () => {
    const fallback = area_box(ANCHOR, "");
    expect(fallback).toEqual(area_box(ANCHOR, "block-end center"));
    expect(area_box(ANCHOR, "top garbage")).toEqual(fallback);
    expect(area_box(ANCHOR, "top bottom")).toEqual(fallback);
  });
});

describe("position_area — self-alignment inside the rect", () => {
  const self: Box = { x: 0, y: 0, w: 200, h: 120 };
  const place = (area: string) => position_area(self, ANCHOR, area);

  it("outward regions hug the anchor's edge", () => {
    expect(place("bottom")).toEqual({ x: 260, y: 300 });
    expect(place("top")).toEqual({ x: 260, y: 140 });
  });

  it("span regions go flush against the anchor's far edge", () => {
    expect(place("top span-left")).toMatchObject({ x: 220 }); // 420 − 200
    expect(place("top span-right")).toMatchObject({ x: 300 });
  });

  it("centers on the anchor, not the rect, and may overflow it", () => {
    // span-all's rect is the whole window; anchor-center still centres on
    // the anchor. `center`'s rect is 120 wide — a 200-wide box overflows it.
    expect(place("bottom")).toMatchObject({ x: 260 });
    expect(place("center")).toEqual({ x: 260, y: 220 });
  });
});
