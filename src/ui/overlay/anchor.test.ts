import { describe, expect, it } from "vitest";
import { effect } from "@/signals/index.ts";
import { anchor_length, PositionArea } from "./anchor.ts";
import type { PositionAreaValue } from "./anchor.ts";
import { line } from "./area.ts";
import type { Area } from "./area.ts";
import type { ReadonlyBox } from "./box.ts";

/** A box as a region. */
const rect = (x: number, y: number, w: number, h: number) => ({
  xmin: x,
  xmax: x + w,
  ymin: y,
  ymax: y + h,
});


/** Which point of the box faces the anchor, as OverlayBox.origin takes it. */
const originOf = (a: Area) => ({ x: a.xalign, y: a.yalign });

/** The containing block used throughout. */
const BOUNDS = { xmin: 0, xmax: 800, ymin: 0, ymax: 600 };

/** Where a box lands: {@link line}, less the aligned share of its size — what
 * OverlayBox's origin shift does in CSS. A free axis keeps the box's own. */
const placed = (a: Area, b: ReturnType<typeof rect>) => {
  const { x, y } = line(a);
  return {
    x: x === null ? b.xmin : x - (a.xalign ?? 0) * (b.xmax - b.xmin),
    y: y === null ? b.ymin : y - (a.yalign ?? 0) * (b.ymax - b.ymin),
  };
};


/** The line an area's box aligns on — the anchor line `anchor()` would
 * name. */
const at = (a: Area, axis: "x" | "y") => line(a)[axis];

describe("anchor_length", () => {
  const rect: ReadonlyBox = { x: 100, y: 200, w: 40, h: 20 };
  it("resolves physical edges and centers", () => {
    expect(anchor_length(rect, "top", "top")).toBe(200);
    expect(anchor_length(rect, "top", "bottom")).toBe(220);
    expect(anchor_length(rect, "left", "left")).toBe(100);
    expect(anchor_length(rect, "left", "right")).toBe(140);
    expect(anchor_length(rect, "top", "center")).toBe(210);
  });
});

/** The anchor used throughout: edges at x 300→420, y 260→300. */
const ANCHOR: ReadonlyBox = { x: 300, y: 260, w: 120, h: 40 };

describe("PositionArea — resolving the area to anchor lines", () => {
  // Anchor edges: x 300→420, y 260→300.
  const pin = (area: PositionAreaValue) => {
    const r = new PositionArea(ANCHOR, area, BOUNDS);
    return { x: at(r, "x"), y: at(r, "y"), origin: originOf(r) };
  };

  it("pins the anchor edge an outward region sits against", () => {
    // Below the anchor: the box's top edge lands on the anchor's bottom.
    expect(pin("bottom")).toEqual({ x: 360, y: 300, origin: { x: 0.5, y: 0 } });
    // Above: its bottom edge lands on the anchor's top.
    expect(pin("top")).toEqual({ x: 360, y: 260, origin: { x: 0.5, y: 1 } });
  });

  it("spans pin the anchor's far edge", () => {
    expect(pin("top span-left")).toMatchObject({ x: 420, origin: { x: 1, y: 1 } });
    expect(pin("top span-right")).toMatchObject({ x: 300, origin: { x: 0, y: 1 } });
  });

  it("an axis-specific keyword leaves the other axis anchor-centred", () => {
    // inline-end → right of the anchor, block span-all → centred on it.
    expect(pin("inline-end")).toEqual({ x: 420, y: 280, origin: { x: 0, y: 0.5 } });
  });

  it("centre pins the anchor's middle on both axes", () => {
    expect(pin("center")).toEqual({ x: 360, y: 280, origin: { x: 0.5, y: 0.5 } });
  });

  it("flips inline logical sides in RTL, never physical ones", () => {
    document.documentElement.style.direction = "rtl";
    try {
      // inline-start in RTL is the right-hand side.
      expect(pin("inline-start")).toMatchObject({ x: 420, origin: { x: 0, y: 0.5 } });
      // `left` is physical — unmoved.
      expect(pin("left")).toMatchObject({ x: 300, origin: { x: 1, y: 0.5 } });
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
    const anchor = { x: 300, y: 260, w: 120, h: 40 };
    const region = new PositionArea(anchor, "bottom", BOUNDS);
    anchor.y = 500;
    expect(at(region, "y")).toBe(540);
    // Still anchor-centred on the moved anchor.
    expect(placed(region, rect(0, 0, 100, 10))).toMatchObject({
      x: 310,
      y: 540,
    });
  });
});

describe("PositionArea — re-aiming the region", () => {
  it("re-resolves when the area is assigned", () => {
    const region = new PositionArea(ANCHOR, "bottom", BOUNDS);
    expect({ y: at(region, "y"), origin: originOf(region) }).toEqual({
      y: 300,
      origin: { x: 0.5, y: 0 },
    });

    region.area = "top";
    expect({ y: at(region, "y"), origin: originOf(region) }).toEqual({
      y: 260,
      origin: { x: 0.5, y: 1 },
    });
  });

  it("re-pins when the anchor is swapped", () => {
    const region = new PositionArea(ANCHOR, "bottom", BOUNDS);
    expect({ x: at(region, "x"), y: at(region, "y") }).toEqual({ x: 360, y: 300 });

    // Edges at x 0→100, y 0→20.
    region.anchor = { x: 0, y: 0, w: 100, h: 20 };
    expect({ x: at(region, "x"), y: at(region, "y") }).toEqual({ x: 50, y: 20 });
    expect(placed(region, rect(0, 0, 40, 10))).toEqual({ x: 30, y: 20 });
  });

  it("re-runs an effect on either assignment", () => {
    const region = new PositionArea(ANCHOR, "bottom", BOUNDS);
    const seen: (number | null)[] = [];
    effect(() => seen.push(at(region, "y")));

    region.area = "top";
    region.anchor = { x: 0, y: 0, w: 100, h: 20 };
    expect(seen).toEqual([300, 260, 0]);
  });

  it("resolves logical keywords against the anchor's own direction", () => {
    // Anchor edges: x 300→420. `inline-start` is the left edge in LTR, the
    // right one in RTL — the anchor stands in for the containing block.
    const rtl = { ...ANCHOR, direction: "rtl" as const };
    expect(at(new PositionArea(ANCHOR, "inline-start", BOUNDS), "x")).toBe(300);
    expect(at(new PositionArea(rtl, "inline-start", BOUNDS), "x")).toBe(420);
  });
});

describe("PositionArea — origin, for the enter/exit scale", () => {
  const origin = (area: PositionAreaValue) =>
    originOf(new PositionArea(ANCHOR, area, BOUNDS));

  it("grows from the edge facing the anchor", () => {
    expect(origin("top")).toEqual({ x: 0.5, y: 1 });
    expect(origin("bottom")).toEqual({ x: 0.5, y: 0 });
    expect(origin("left")).toEqual({ x: 1, y: 0.5 });
    expect(origin("right")).toEqual({ x: 0, y: 0.5 });
  });

  it("pins a corner when both axes are outward", () => {
    expect(origin("top left")).toEqual({ x: 1, y: 1 });
    expect(origin("bottom right")).toEqual({ x: 0, y: 0 });
  });

  it("uses the pinned edge on a spanning axis, not its centre", () => {
    expect(origin("top span-right")).toEqual({ x: 0, y: 1 });
    expect(origin("top span-left")).toEqual({ x: 1, y: 1 });
  });

  it("centres where the area centres", () => {
    expect(origin("center")).toEqual({ x: 0.5, y: 0.5 });
    expect(origin("span-all")).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe("place — self-alignment inside the room", () => {
  const self: ReadonlyBox = { x: 0, y: 0, w: 200, h: 120 };
  const place = (area: PositionAreaValue) =>
    placed(new PositionArea(ANCHOR, area, BOUNDS), rect(0, 0, self.w, self.h));

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
    const tall: ReadonlyBox = { x: 0, y: 0, w: 200, h: 300 };
    expect(placed(new PositionArea(ANCHOR, "top", BOUNDS), rect(0, 0, tall.w, tall.h))).toEqual({
      x: 260,
      y: -40,
    });
  });
});
