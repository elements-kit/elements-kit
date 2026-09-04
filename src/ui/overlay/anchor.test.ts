import { describe, expect, it } from "vitest";
import { anchor_length, PositionArea } from "./anchor.ts";
import type { PositionAreaValue } from "./anchor.ts";
import type { Box } from "./box.ts";

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

describe("PositionArea — resolving the area to pins", () => {
  // Anchor edges: x 300→420, y 260→300.
  const pin = (area: PositionAreaValue) => {
    const { x, y, origin } = new PositionArea(ANCHOR, area);
    return { x, y, origin };
  };

  it("pins the anchor edge an outward region sits against", () => {
    // Below the anchor: the box's top edge lands on the anchor's bottom.
    expect(pin("bottom")).toEqual({ x: 360, y: 300, origin: { x: "center", y: "top" } });
    // Above: its bottom edge lands on the anchor's top.
    expect(pin("top")).toEqual({ x: 360, y: 260, origin: { x: "center", y: "bottom" } });
  });

  it("spans pin the anchor's far edge", () => {
    expect(pin("top span-left")).toMatchObject({ x: 420, origin: { x: "right", y: "bottom" } });
    expect(pin("top span-right")).toMatchObject({ x: 300, origin: { x: "left", y: "bottom" } });
  });

  it("an axis-specific keyword leaves the other axis anchor-centred", () => {
    // inline-end → right of the anchor, block span-all → centred on it.
    expect(pin("inline-end")).toEqual({ x: 420, y: 280, origin: { x: "left", y: "center" } });
  });

  it("centre pins the anchor's middle on both axes", () => {
    expect(pin("center")).toEqual({ x: 360, y: 280, origin: { x: "center", y: "center" } });
  });

  it("flips inline logical sides in RTL, never physical ones", () => {
    document.documentElement.style.direction = "rtl";
    try {
      // inline-start in RTL is the right-hand side.
      expect(pin("inline-start")).toMatchObject({ x: 420, origin: { x: "left", y: "center" } });
      // `left` is physical — unmoved.
      expect(pin("left")).toMatchObject({ x: 300, origin: { x: "right", y: "center" } });
    } finally {
      document.documentElement.style.direction = "";
    }
  });

  it("falls back to bottom-center for empty or malformed input", () => {
    // `PositionAreaValue` rejects all three at compile time; the cast is what
    // a value read from CSS looks like, and the fallback is for those.
    const bad = (area: string) => pin(area as never);
    const fallback = pin("block-end center");
    expect(bad("")).toEqual(fallback);
    expect(bad("top garbage")).toEqual(fallback);
    expect(bad("top bottom")).toEqual(fallback);
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

describe("PositionArea — origin, for the enter/exit scale", () => {
  const origin = (area: PositionAreaValue) =>
    new PositionArea(ANCHOR, area).origin;

  it("grows from the edge facing the anchor", () => {
    expect(origin("top")).toEqual({ x: "center", y: "bottom" });
    expect(origin("bottom")).toEqual({ x: "center", y: "top" });
    expect(origin("left")).toEqual({ x: "right", y: "center" });
    expect(origin("right")).toEqual({ x: "left", y: "center" });
  });

  it("pins a corner when both axes are outward", () => {
    expect(origin("top left")).toEqual({ x: "right", y: "bottom" });
    expect(origin("bottom right")).toEqual({ x: "left", y: "top" });
  });

  it("uses the pinned edge on a spanning axis, not its centre", () => {
    expect(origin("top span-right")).toEqual({ x: "left", y: "bottom" });
    expect(origin("top span-left")).toEqual({ x: "right", y: "bottom" });
  });

  it("centres where the area centres", () => {
    expect(origin("center")).toEqual({ x: "center", y: "center" });
    expect(origin("span-all")).toEqual({ x: "center", y: "center" });
  });
});

describe("Region.place — self-alignment inside the rect", () => {
  const self: Box = { x: 0, y: 0, w: 200, h: 120 };
  const place = (area: PositionAreaValue) =>
    new PositionArea(ANCHOR, area).place(self);

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
    });
  });
});
