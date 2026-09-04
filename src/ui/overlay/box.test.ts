import { describe, expect, it } from "vitest";
import { effect, effectScope, signal } from "@/signals/index.ts";
import { MarginBox } from "./box.ts";
import type { Box } from "./box.ts";

/** Edges at x 300→420, y 260→300. */
const inner = (): Box => ({ x: 300, y: 260, w: 120, h: 40 });

const edges = (b: MarginBox) => ({
  left: b.x,
  top: b.y,
  right: b.x + b.w,
  bottom: b.y + b.h,
});

describe("MarginBox", () => {
  it("grows every side from one value, as `margin` does", () => {
    expect(edges(new MarginBox(inner(), 10))).toEqual({
      left: 290,
      top: 250,
      right: 430,
      bottom: 310,
    });
  });

  it("takes two values as block then inline", () => {
    expect(edges(new MarginBox(inner(), 8, 0))).toEqual({
      left: 300,
      top: 252,
      right: 420,
      bottom: 308,
    });
  });

  it("takes three as top, inline, bottom", () => {
    expect(edges(new MarginBox(inner(), 1, 2, 3))).toEqual({
      left: 298,
      top: 259,
      right: 422,
      bottom: 303,
    });
  });

  it("takes four as each side", () => {
    expect(edges(new MarginBox(inner(), 1, 2, 3, 4))).toEqual({
      left: 296,
      top: 259,
      right: 422,
      bottom: 303,
    });
  });

  it("defaults to no margin", () => {
    expect(edges(new MarginBox(inner()))).toEqual({
      left: 300,
      top: 260,
      right: 420,
      bottom: 300,
    });
  });

  it("reads through to the wrapped box", () => {
    const box = inner();
    const margin = new MarginBox(box, 10);
    box.y = 500;
    expect(margin.y).toBe(490);
  });

  it("swaps the wrapped box on assignment", () => {
    const margin = new MarginBox(inner(), 10);
    margin.box = { x: 0, y: 0, w: 10, h: 10 };
    expect(edges(margin)).toEqual({
      left: -10,
      top: -10,
      right: 20,
      bottom: 20,
    });
  });

  it("notifies on assignment — every field is reactive", () => {
    const margin = new MarginBox(inner(), 10);
    const seen: number[] = [];
    effectScope(() => {
      effect(() => seen.push(margin.y));
    });
    expect(seen).toEqual([250]);
    margin.top = 40;
    expect(seen).toEqual([250, 220]);
    margin.box = { x: 0, y: 0, w: 0, h: 0 };
    expect(seen).toEqual([250, 220, -40]);
  });

  it("resolves a reactive side on every read", () => {
    const gap = signal(8);
    const margin = new MarginBox(inner(), gap);
    expect(margin.y).toBe(252);
    gap(20);
    expect(margin.y).toBe(240);
    expect(margin.h).toBe(80);
  });
});
