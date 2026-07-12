import { describe, expect, it } from "vitest";
import { signal } from "@/signals/index.ts";
import {
  Anchor,
  anchor_length,
  type Area,
  placeArea,
  placeAxis,
  position_area,
  resolveArea,
  shift,
  tryFallbacks,
} from "./anchor.ts";
import { ElementBox, type IBox } from "./element-box.ts";

const HUGE: IBox = { x: 0, y: 0, w: 10000, h: 10000 };

/** An `ElementBox` over a rect-mocked div (happy-dom has no layout). */
function box(w: number, h: number, x = 0, y = 0): ElementBox {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({
      x, y, left: x, top: y, right: x + w, bottom: y + h,
      width: w, height: h, toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(el);
  return new ElementBox(el);
}

describe("anchor_length", () => {
  const rect: IBox = { x: 100, y: 200, w: 40, h: 20 };
  it("resolves physical edges and centers", () => {
    expect(anchor_length(rect, "top", "top")).toBe(200);
    expect(anchor_length(rect, "top", "bottom")).toBe(220);
    expect(anchor_length(rect, "left", "left")).toBe(100);
    expect(anchor_length(rect, "left", "right")).toBe(140);
    expect(anchor_length(rect, "top", "center")).toBe(210);
  });
});

describe("resolveArea — the position-area grid", () => {
  it("spans the other axis for an axis-specific keyword", () => {
    expect(resolveArea("bottom")).toEqual({ block: "end", inline: "span-all" });
    expect(resolveArea("inline-end")).toEqual({ block: "span-all", inline: "end" });
  });
  it("applies an ambiguous keyword to both axes", () => {
    expect(resolveArea("center")).toEqual({ block: "center", inline: "center" });
    expect(resolveArea("start")).toEqual({ block: "start", inline: "start" });
  });
  it("assigns two keywords + span tokens", () => {
    expect(resolveArea("top left")).toEqual({ block: "start", inline: "start" });
    expect(resolveArea("block-end span-inline-end")).toEqual({
      block: "end", inline: "span-end",
    });
  });
  it("flips inline logical sides in RTL, never physical/block", () => {
    expect(resolveArea("inline-start", "rtl")).toEqual({
      block: "span-all", inline: "end",
    });
    expect(resolveArea("left", "rtl")).toEqual({
      block: "span-all", inline: "start",
    });
  });
  it("falls back to bottom-center for unknown/empty", () => {
    expect(resolveArea("")).toEqual({ block: "end", inline: "center" });
  });
});

describe("placeAxis / placeArea", () => {
  it("insets outward regions, centers span/center, flushes spans", () => {
    expect(placeAxis(100, 140, 20, "start", 8)).toBe(72);
    expect(placeAxis(100, 140, 20, "end", 8)).toBe(148);
    expect(placeAxis(100, 140, 20, "center", 8)).toBe(110);
    expect(placeAxis(100, 140, 20, "span-start", 8)).toBe(120);
    expect(placeAxis(100, 140, 20, "span-end", 8)).toBe(100);
  });
  it("places a box below-and-centered for bottom", () => {
    const self: IBox = { x: 0, y: 0, w: 200, h: 120 };
    const anchor: IBox = { x: 300, y: 260, w: 120, h: 40 };
    expect(placeArea(self, anchor, resolveArea("bottom"), 8)).toEqual({
      x: 260, y: 308,
    });
  });
});

describe("tryFallbacks / shift", () => {
  const self: IBox = { x: 0, y: 0, w: 100, h: 100 };
  const anchor: IBox = { x: 400, y: 300, w: 40, h: 40 };
  const pref: Area = { block: "end", inline: "center" };
  it("keeps the preferred area when it fits, flips when it overflows", () => {
    expect(tryFallbacks(self, anchor, pref, 0, HUGE)).toEqual(pref);
    expect(tryFallbacks(self, anchor, pref, 0, { x: 0, y: 0, w: 1000, h: 360 })).toEqual({
      block: "start", inline: "center",
    });
  });
  it("clamps a box back inside the boundary", () => {
    expect(shift({ x: -20, y: 50 }, self, HUGE)).toEqual({ x: 0, y: 50 });
  });
});

describe("position_area — the reactive writer", () => {
  it("writes the placed coordinate to self.x/y", () => {
    const overlay = box(200, 120);
    const anchor: IBox = { x: 300, y: 260, w: 120, h: 40 };
    const stop = position_area(overlay, anchor, "bottom", 8, HUGE);
    expect(overlay.x).toBe(260);
    expect(overlay.y).toBe(308);
    stop();
    overlay.dispose();
  });

  it("re-places when the anchor moves (reactive follow)", () => {
    const overlay = box(200, 120);
    const ax = signal(300);
    const anchor: IBox = { get x() { return ax(); }, y: 260, w: 120, h: 40 };
    const stop = position_area(overlay, anchor, "bottom", 0, HUGE);
    expect(overlay.x).toBe(260);
    ax(500);
    expect(overlay.x).toBe(460);
    stop();
    overlay.dispose();
  });

  it("the pinned gate holds the box's own base as the fallback", () => {
    const overlay = box(200, 120);
    const anchor: IBox = { x: 300, y: 260, w: 120, h: 40 };
    const pinned = signal(false);
    overlay.x = 999;
    overlay.y = 888;
    const stop = position_area(overlay, anchor, "bottom", 8, HUGE, pinned);
    expect(overlay.x).toBe(999); // unpinned → no follow
    pinned(true);
    expect(overlay.x).toBe(260); // re-pinned → snaps to the anchor
    stop();
    overlay.dispose();
  });
});

describe("Anchor", () => {
  it("wraps a plain box as an IBox", () => {
    const a = new Anchor({ x: 10, y: 20, w: 30, h: 40 });
    expect([a.x, a.y, a.w, a.h]).toEqual([10, 20, 30, 40]);
  });

  it("a dot box (no w/h) reads zero size", () => {
    const a = new Anchor({ x: 5, y: 6 });
    expect([a.w, a.h]).toEqual([0, 0]);
  });

  it("tracks an element's live rect", () => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () =>
      ({ x: 7, y: 8, left: 7, top: 8, right: 27, bottom: 38,
         width: 20, height: 30, toJSON: () => ({}) }) as DOMRect;
    document.body.appendChild(el);
    const a = new Anchor(el);
    expect([a.x, a.y, a.w, a.h]).toEqual([7, 8, 20, 30]);
    a.dispose();
    el.remove();
  });
});
