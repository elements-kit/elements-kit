import { describe, expect, it } from "vitest";
import { effect } from "@/signals/index.ts";
import { fits, intersect, line, MutableArea, place } from "./area.ts";
import type { Area } from "./area.ts";
import { MarginBox } from "./box.ts";

const WINDOW = { xmin: 0, xmax: 800, ymin: 0, ymax: 600 };
/** A box as a region. */
const rect = (x: number, y: number, w: number, h: number) => ({
  xmin: x,
  xmax: x + w,
  ymin: y,
  ymax: y + h,
});
const size = rect(50, 50, 100, 40);

/** Where a box lands: {@link line}, less the aligned share of its size — what
 * OverlayBox's origin shift does in CSS. A free axis keeps the box's own. */
const placed = (a: Area, b: ReturnType<typeof rect>) => {
  const { x, y } = line(a);
  return {
    x: x === null ? b.xmin : x - (a.xalign ?? 0) * (b.xmax - b.xmin),
    y: y === null ? b.ymin : y - (a.yalign ?? 0) * (b.ymax - b.ymin),
  };
};


describe("RegionBox", () => {
  it("box classes are regions, and live", () => {
    const inner = { x: 300, y: 260, w: 120, h: 40 }; // a plain box
    const m = new MarginBox(inner, 10);
    expect([m.xmin, m.xmax, m.ymin, m.ymax]).toEqual([290, 430, 250, 310]);
  });
});

describe("intersect", () => {
  it("takes the tightest edge per side", () => {
    const r = intersect(WINDOW, { xmin: 700, xmax: 900, ymin: -50, ymax: 50 });
    expect(r).toEqual({ xmin: 700, xmax: 800, ymin: 0, ymax: 50 });
  });

  it("keeps open edges undefined", () => {
    expect(intersect({ ymin: 450 })).toEqual({
      xmin: undefined,
      xmax: undefined,
      ymin: 450,
      ymax: undefined,
    });
  });

  it("two corners and an open side", () => {
    const r = intersect({ xmin: 100, ymin: 50 }, { xmax: 300 });
    expect(r).toEqual({ xmin: 100, xmax: 300, ymin: 50, ymax: undefined });
  });

  it("is null when they share no space — never crossed", () => {
    expect(intersect({ xmin: 500 }, { xmax: 100 })).toBeNull();
    expect(intersect(WINDOW, { ymin: 700 })).toBeNull();
  });

  it("touching edges share a zero-size line, not nothing", () => {
    expect(intersect({ xmin: 100 }, { xmax: 100 })).toMatchObject({ xmin: 100, xmax: 100 });
  });
});

describe("fits", () => {
  it("compares the size with the room; an open axis always fits", () => {
    const sheet = intersect(new MutableArea({ ymax: 300, yalign: 1 }), WINDOW)!;
    expect(fits(sheet, rect(0, 0, 800, 300))).toBe(true);
    expect(fits(sheet, rect(0, 0, 800, 301))).toBe(false);
    expect(fits({ ymax: 300 }, rect(0, 0, 9e9, 1))).toBe(true);
  });
});

describe("line", () => {
  it("is the edge the box sticks to, or a point between", () => {
    expect(line({ xmin: 0, xmax: 200, xalign: 0.25, ymax: 300, yalign: 1 })).toEqual({ x: 50, y: 300 });
    expect(line({ xmin: 10 })).toEqual({ x: null, y: null });
    expect(line({ xmax: 10, xalign: 0.5 })).toEqual({ x: null, y: null }); // centre needs both edges
  });


  it("sticks to the aligned edge", () => {
    const corner = { ...WINDOW, xmax: 400, ymax: 300, xalign: 1, yalign: 1 } as const;
    expect(placed(corner, size)).toEqual({ x: 300, y: 260 });
  });

  it("an open area sticks to its one edge", () => {
    expect(placed(new MutableArea({ xmax: 400, xalign: 1, ymax: 300, yalign: 1 }), size)).toEqual({
      x: 300,
      y: 260,
    });
  });

  it("a fraction sits between the edges", () => {
    const a = { xmin: 0, xmax: 200, xalign: 0.25, ymin: 0, ymax: 100, yalign: 0.5 };
    expect(placed(a, size)).toEqual({ x: 25, y: 30 });
  });

  it("a free axis keeps the box's own coordinate", () => {
    const sheet = { ...WINDOW, yalign: 1 } as const;
    expect(placed(sheet, size)).toEqual({ x: 50, y: 560 });
  });
});

describe("place", () => {
  it("sets the origin and the line, leaving a free axis alone", () => {
    const box = { origin: {}, x: 7, y: 9 };
    place(box, { xmin: 0, xmax: 200, xalign: 0.5, ymax: 300, yalign: 1 });
    expect(box).toEqual({ origin: { x: 0.5, y: 1 }, x: 100, y: 300 });
    place(box, { ymin: 20, yalign: 0 });
    expect(box).toEqual({ origin: { x: undefined, y: 0 }, x: 100, y: 20 });
  });
});

describe("MutableArea", () => {
  it("is an area whose writes an effect follows", () => {
    const a = new MutableArea({ ymax: 300, yalign: 1 });
    const seen: number[] = [];
    effect(() => void seen.push(placed(a, rect(0, 0, 10, 40)).y));
    a.ymax = 200;
    expect(seen).toEqual([260, 160]);
  });

  it("an unset axis is free", () => {
    const a = new MutableArea({ ymin: 20, yalign: 0 });
    expect(placed(a, rect(9, 9, 40, 30))).toEqual({ x: 9, y: 20 });
  });
});
