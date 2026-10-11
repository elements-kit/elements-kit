import { describe, expect, it } from "vitest";
import { effect, signal } from "@/signals/index.ts";
import { PositionArea } from "./anchor.ts";
import { line } from "./area.ts";
import type { Area } from "./area.ts";
import type { ReadonlyBox } from "./box.ts";
import { PositionTry } from "./try.ts";

const BOUNDS = { xmin: 0, xmax: 800, ymin: 0, ymax: 600 };
/** Edges at x 300→420, y 260→300. */
const ANCHOR: ReadonlyBox = { x: 300, y: 260, w: 120, h: 40 };
/** A box as a region. */
const rect = (x: number, y: number, w: number, h: number) => ({
  xmin: x,
  xmax: x + w,
  ymin: y,
  ymax: y + h,
});
const box = (w: number, h: number) => rect(0, 0, w, h);

/** Where a box lands: {@link line}, less the aligned share of its size — what
 * OverlayBox's origin shift does in CSS. A free axis keeps the box's own. */
const placed = (a: Area, b: ReturnType<typeof rect>) => {
  const { x, y } = line(a);
  return {
    x: x === null ? b.xmin : x - (a.xalign ?? 0) * (b.xmax - b.xmin),
    y: y === null ? b.ymin : y - (a.yalign ?? 0) * (b.ymax - b.ymin),
  };
};


describe("PositionTry", () => {
  // below has 300 of room, above 260.
  const below = new PositionArea(ANCHOR, "bottom", BOUNDS);
  const above = new PositionArea(ANCHOR, "top", BOUNDS);

  it("takes the first candidate that fits", () => {
    const t = new PositionTry(rect(0, 0, 100, 200), [below, above]);
    expect(t.chosen).toBe(below);
    expect(placed(t, box(100, 200))).toEqual({ x: 310, y: 300 });
  });

  it("falls back when the first overflows", () => {
    const t = new PositionTry(rect(0, 0, 100, 280), [above, below]);
    expect(t.chosen).toBe(below);
    expect([t.xalign, t.yalign]).toEqual([0.5, 0]);
  });

  it("keeps the first when none fit, and says so", () => {
    const t = new PositionTry(rect(0, 0, 100, 400), [below, above]);
    expect(t.chosen).toBe(below);
    expect(t.fits).toBe(false);
    t.subject = rect(0, 0, 100, 100);
    expect(t.fits).toBe(true);
  });

  it("tries boxes, landing at their top-left", () => {
    const slot = { xmin: 20, xmax: 320, ymin: 20, ymax: 320, xalign: 0, yalign: 0 };
    const all = { ...BOUNDS, xalign: 0, yalign: 0 };
    const t = new PositionTry(rect(0, 0, 100, 400), [below, slot, all]);
    expect(t.chosen).toBe(all);
    t.subject = rect(0, 0, 100, 100);
    expect(t.chosen).toBe(below);
    t.candidates = [slot];
    expect(placed(t, box(100, 100))).toEqual({ x: 20, y: 20 });
  });

  it("bounds per candidate — the scroller first, then the window", () => {
    const scroller = { xmin: 200, xmax: 600, ymin: 100, ymax: 350 };
    const inside = new PositionArea(ANCHOR, "bottom", scroller);
    const spill = new PositionArea(ANCHOR, "bottom", BOUNDS);
    const t = new PositionTry(rect(0, 0, 100, 100), [inside, spill]);
    expect(t.chosen).toBe(spill); // 50 below inside the scroller
    t.subject = rect(0, 0, 100, 40);
    expect(t.chosen).toBe(inside);
  });

  it("follows the anchor past its container; the room only shrinks", () => {
    // Anchor scrolled above the scroller: its bottom (−50) is outside.
    const off: ReadonlyBox = { x: 300, y: -90, w: 120, h: 40 };
    const scroller = { xmin: 200, xmax: 600, ymin: 100, ymax: 350 };
    const below = new PositionArea(off, "bottom span-right", scroller);
    // Placed on the anchor, not stuck at the scroller's top edge.
    expect(line(below)).toEqual({ x: 300, y: -50 });
    // The room is measured to the scroller's far edge: 400 — it still fits.
    const t = new PositionTry(box(100, 40), [below]);
    expect(t.fits).toBe(true);
  });

  it("intersect(container) stops at the container's edge instead", () => {
    const off: ReadonlyBox = { x: 300, y: -90, w: 120, h: 40 };
    const scroller = { xmin: 200, xmax: 600, ymin: 100, ymax: 350 };
    const below = new PositionArea(off, "bottom span-right", scroller);
    const stuck = below.intersect(below.container);
    // The anchor's bottom (−50) cut by the scroller's top.
    expect(line(stuck)).toEqual({ x: 300, y: 100 });
    // Live: the anchor scrolls back in, and the cut lets go.
    const low = new PositionArea({ ...off, y: 160 }, "bottom span-right", scroller);
    expect(line(low.intersect(low.container))).toEqual({ x: 300, y: 200 });
  });

  it("skips a candidate with no room", () => {
    // Anchor below the scroller: nothing below it is inside.
    const low: ReadonlyBox = { x: 300, y: 500, w: 120, h: 40 };
    const scroller = { xmin: 200, xmax: 600, ymin: 100, ymax: 350 };
    const none = new PositionArea(low, "bottom", scroller);
    const t = new PositionTry(rect(0, 0, 10, 10), [none, above]);
    expect(t.chosen).toBe(above);
  });

  it("most-height ranks by room before trying", () => {
    const t = new PositionTry(rect(0, 0, 10, 10), [above, below], "most-height");
    expect(t.chosen).toBe(below);
  });

  it("re-chooses as the subject grows", () => {
    const h = signal(100);
    const t = new PositionTry(
      {
        xmin: 0,
        xmax: 100,
        ymin: 0,
        get ymax() {
          return h();
        },
      },
      [above, below],
    );
    const seen: unknown[] = [];
    effect(() => void seen.push(t.chosen));
    h(280);
    expect(seen).toEqual([above, below]);
  });
});
