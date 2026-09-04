import { describe, expect, it } from "vitest";
import { MutableRegion, placeAxis } from "./area.ts";
import type { Box } from "./box.ts";

describe("placeAxis", () => {
  it("start puts the box's lo edge on the pin", () => {
    expect(placeAxis({ align: "start", at: 100 }, 7, 50)).toBe(100);
  });

  it("end puts the box's hi edge on the pin", () => {
    expect(placeAxis({ align: "end", at: 400 }, 7, 50)).toBe(350);
  });

  it("center centres the box on the pin", () => {
    expect(placeAxis({ align: "center", at: 50 }, 7, 50)).toBe(25);
  });

  it("a free axis keeps the box's own coordinate", () => {
    expect(placeAxis(null, 7, 50)).toBe(7);
  });
});

describe("MutableRegion", () => {
  const box: Box = { x: 9, y: 9, w: 40, h: 30 };

  it("a corner pins both axes", () => {
    const r = new MutableRegion({ right: 400, bottom: 300 });
    expect(r.place(box)).toEqual({ x: 360, y: 270, w: 40, h: 30 });
  });

  it("a side pins one axis and leaves the other to the box", () => {
    const sheet = new MutableRegion({ bottom: 300 });
    expect(sheet.place(box)).toEqual({ x: 9, y: 270, w: 40, h: 30 });
  });

  it("reads back the pinned edge and null for the rest — CSS insets", () => {
    const r = new MutableRegion({ left: 10, bottom: 300 });
    expect(r.left).toBe(10);
    expect(r.right).toBeNull();
    expect(r.top).toBeNull();
    expect(r.bottom).toBe(300);
  });

  it("pinning the opposite edge releases the first", () => {
    const r = new MutableRegion({ left: 10 });
    r.right = 400;
    expect(r.left).toBeNull();
    expect(r.right).toBe(400);
    expect(r.place(box)).toMatchObject({ x: 360 });
  });

  it("assigning null frees the axis", () => {
    const r = new MutableRegion({ left: 10, top: 20 });
    r.left = null;
    expect(r.left).toBeNull();
    expect(r.place(box)).toMatchObject({ x: 9, y: 20 });
  });
});
