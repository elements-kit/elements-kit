import { afterEach, describe, expect, it } from "vitest";
import { computed, signal } from "@/signals/index.ts";
import {
  anchor_length,
  placeArea,
  placeAxis,
  position_area,
  resolveArea,
  shift,
  tryFallbacks,
} from "./anchor.ts";
import type { Area, BlockSide, InlineSide, Inset } from "./anchor.ts";
import { ElementBox } from "./box.ts";
import type { IBox, IDirection } from "./box.ts";

/** An `ElementBox` over a rect-mocked div (happy-dom has no layout). */
function overlayBox(w: number, h: number, x = 0, y = 0): ElementBox {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({
      x, y, left: x, top: y, right: x + w, bottom: y + h,
      width: w, height: h, toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(el);
  return new ElementBox(el);
}

const HUGE: IBox = { x: 0, y: 0, w: 10000, h: 10000 };

/** Bind a box to the `anchor()` utility so the specs read `a.length(...)` —
 * the same surface `Anchorable` boxes expose. */
const anchorAt = (box: IBox & Partial<IDirection>) => ({
  length: (inset: Inset, side: BlockSide | InlineSide | number) =>
    anchor_length(box, inset, side),
});

// rect: left 100, top 200, right 140, bottom 220, center (120, 210)
const RECT = { x: 100, y: 200, w: 40, h: 20 };

afterEach(async () => {
  document.documentElement.style.removeProperty("direction");
  document.documentElement.removeAttribute("dir");
  document.body.innerHTML = "";
  // Let the direction singleton's MutationObserver resync to LTR.
  await new Promise((r) => setTimeout(r));
});

/** Flip the page direction so BOTH readers see it: inline style for
 * direct `getComputedStyle` reads (happy-dom computes it), the `dir`
 * attribute for the reactive `direction` singleton's observer (which
 * happy-dom does NOT reflect into computed style). */
async function pageRtl(): Promise<void> {
  document.documentElement.style.direction = "rtl";
  document.documentElement.dir = "rtl";
  await new Promise((r) => setTimeout(r)); // observer microtask
}

describe("length() — physical sides", () => {
  it("resolves the four edges", () => {
    const a = anchorAt(RECT);
    expect(a.length("top", "top")).toBe(200);
    expect(a.length("top", "bottom")).toBe(220);
    expect(a.length("left", "left")).toBe(100);
    expect(a.length("left", "right")).toBe(140);
  });

  it("is inset-independent for physical sides", () => {
    const a = anchorAt(RECT);
    expect(a.length("bottom", "top")).toBe(200);
    expect(a.length("right", "left")).toBe(100);
  });

  it("center picks the axis from the inset", () => {
    const a = anchorAt(RECT);
    expect(a.length("top", "center")).toBe(210);
    expect(a.length("left", "center")).toBe(120);
  });
});

describe("length() — inside / outside", () => {
  it("inside is the inset's own side", () => {
    const a = anchorAt(RECT);
    expect(a.length("top", "inside")).toBe(200); // top: anchor(inside) → top
    expect(a.length("bottom", "inside")).toBe(220);
    expect(a.length("left", "inside")).toBe(100);
    expect(a.length("right", "inside")).toBe(140);
  });

  it("outside is the opposite side", () => {
    const a = anchorAt(RECT);
    expect(a.length("top", "outside")).toBe(220);
    expect(a.length("bottom", "outside")).toBe(200);
    expect(a.length("left", "outside")).toBe(140);
    expect(a.length("right", "outside")).toBe(100);
  });

  it("far-edge insets (bottom/right) resolve through the else arm", () => {
    // The #fraction ternary tests `inset === "top" || inset === "left"` —
    // bottom/right are the ELSE branch, not unhandled. Placement meaning:
    const a = anchorAt(RECT);
    // bottom: anchor(outside) → element's bottom at the anchor's TOP,
    // growing upward — the tooltip-above placement.
    expect(a.length("bottom", "outside")).toBe(RECT.y);
    // bottom: anchor(inside) → flush overlap from the bottom edge up.
    expect(a.length("bottom", "inside")).toBe(RECT.y + RECT.h);
    // right: anchor(outside) → element's right at the anchor's LEFT.
    expect(a.length("right", "outside")).toBe(RECT.x);
    expect(a.length("right", "inside")).toBe(RECT.x + RECT.w);
  });
});

describe("length() — fractions", () => {
  it("a fraction measures from the start edge", () => {
    const a = anchorAt(RECT);
    expect(a.length("top", 0.25)).toBe(205);
    expect(a.length("left", 0.25)).toBe(110);
    expect(a.length("left", 0)).toBe(100);
    expect(a.length("left", 1)).toBe(140);
  });

  it("RTL flips inline fractions, never block ones", async () => {
    await pageRtl();
    const a = anchorAt(RECT);
    expect(a.length("left", 0.25)).toBe(130); // start edge is the right
    expect(a.length("top", 0.25)).toBe(205); // block axis unaffected
  });

  it("extrapolates outside 0–1 like CSS percentages", () => {
    const a = anchorAt(RECT);
    expect(a.length("left", 1.5)).toBe(160);
    expect(a.length("left", -0.5)).toBe(80);
  });
});

describe("length() — logical sides", () => {
  it("start/end follow the containing block's direction (the page, by default)", async () => {
    const a = anchorAt(RECT);
    expect(a.length("left", "start")).toBe(100);
    expect(a.length("left", "end")).toBe(140);
    await pageRtl();
    expect(a.length("left", "start")).toBe(140);
    expect(a.length("left", "end")).toBe(100);
  });

  it("block-axis start/end ignore direction (horizontal writing modes)", async () => {
    await pageRtl();
    const a = anchorAt(RECT);
    expect(a.length("top", "start")).toBe(200);
    expect(a.length("top", "end")).toBe(220);
  });

  it("self-* without a self falls back to the document direction", () => {
    const a = anchorAt(RECT);
    expect(a.length("left", "self-start")).toBe(100);
    document.documentElement.style.direction = "rtl";
    expect(a.length("left", "self-start")).toBe(140);
  });
});

describe("length() — logical insets", () => {
  it("block longhands are fixed in horizontal writing modes", () => {
    const a = anchorAt(RECT);
    // inset-block-start ≡ top, inset-block-end ≡ bottom — even in RTL.
    document.documentElement.style.direction = "rtl";
    expect(a.length("inset-block-start", "outside")).toBe(220);
    expect(a.length("inset-block-end", "outside")).toBe(200);
  });

  it("inline longhands fall back to the document direction without a self", () => {
    const a = anchorAt(RECT);
    // LTR: inline-start ≡ left, so outside = the anchor's right edge.
    expect(a.length("inset-inline-start", "outside")).toBe(140);
    expect(a.length("inset-inline-end", "outside")).toBe(100);
    // RTL: inline-start ≡ RIGHT — inside/outside flip with it.
    document.documentElement.style.direction = "rtl";
    expect(a.length("inset-inline-start", "outside")).toBe(100);
    expect(a.length("inset-inline-start", "inside")).toBe(140);
    expect(a.length("inset-inline-end", "outside")).toBe(140);
  });

  it("physical sides inside a logical inset stay physical", () => {
    document.documentElement.style.direction = "rtl";
    const a = anchorAt(RECT);
    expect(a.length("inset-inline-start", "right")).toBe(140);
    expect(a.length("inset-inline-start", "left")).toBe(100);
  });
});

describe("anchorLength — reactivity", () => {
  it("tracks a reactive anchor box inside a computed", () => {
    const x = signal(100);
    const a = anchorAt({
      get x() {
        return x();
      },
      y: 200,
      w: 40,
      h: 20,
    } as IBox);
    const line = computed(() => a.length("left", "right"));
    expect(line()).toBe(140);
    x(300); // the anchor moved
    expect(line()).toBe(340);
  });

  it("reads the box's live geometry on each call", () => {
    const box = { ...RECT };
    const a = anchorAt(box);
    expect(a.length("top", "bottom")).toBe(220);
    expect(a.length("left", "left")).toBe(100);
    box.x = 300;
    box.h = 50;
    expect(a.length("left", "left")).toBe(300);
    expect(a.length("top", "bottom")).toBe(250);
  });
});

describe("resolveArea — the position-area grid", () => {
  it("spans the other axis for a single axis-specific keyword", () => {
    expect(resolveArea("top")).toEqual({ block: "start", inline: "span-all" });
    expect(resolveArea("bottom")).toEqual({ block: "end", inline: "span-all" });
    expect(resolveArea("left")).toEqual({ block: "span-all", inline: "start" });
    expect(resolveArea("right")).toEqual({ block: "span-all", inline: "end" });
    expect(resolveArea("inline-end")).toEqual({
      block: "span-all",
      inline: "end",
    });
  });

  it("applies a single ambiguous keyword to both axes", () => {
    expect(resolveArea("center")).toEqual({
      block: "center",
      inline: "center",
    });
    expect(resolveArea("start")).toEqual({ block: "start", inline: "start" });
    expect(resolveArea("end")).toEqual({ block: "end", inline: "end" });
    expect(resolveArea("span-all")).toEqual({
      block: "span-all",
      inline: "span-all",
    });
  });

  it("assigns two keywords to their axes, order-independent", () => {
    expect(resolveArea("top left")).toEqual({
      block: "start",
      inline: "start",
    });
    expect(resolveArea("left top")).toEqual({
      block: "start",
      inline: "start",
    });
    expect(resolveArea("bottom right")).toEqual({
      block: "end",
      inline: "end",
    });
  });

  it("maps span tokens (physical + logical)", () => {
    expect(resolveArea("top span-left")).toEqual({
      block: "start",
      inline: "span-start",
    });
    // production's `--overlay-area` example
    expect(resolveArea("block-end span-inline-end")).toEqual({
      block: "end",
      inline: "span-end",
    });
  });

  it("flips inline logical sides in RTL, never physical or block", () => {
    expect(resolveArea("inline-start", "rtl")).toEqual({
      block: "span-all",
      inline: "end",
    });
    expect(resolveArea("left", "rtl")).toEqual({
      block: "span-all",
      inline: "start", // physical — never flips
    });
    expect(resolveArea("start", "rtl")).toEqual({
      block: "start", // block never flips
      inline: "end", // inline flips
    });
  });

  it("self-* resolves against the element's own direction", () => {
    expect(resolveArea("self-start", "ltr", "rtl")).toEqual({
      block: "start",
      inline: "end",
    });
  });

  it("falls back to bottom-center for unknown/empty", () => {
    expect(resolveArea("")).toEqual({ block: "end", inline: "center" });
    expect(resolveArea("nonsense")).toEqual({ block: "end", inline: "center" });
  });
});

describe("placeAxis — region → coordinate", () => {
  // anchor extent [100, 140], box size 20
  it("insets the outward regions by the gap", () => {
    expect(placeAxis(100, 140, 20, "start", 8)).toBe(72); // 100 − 20 − 8
    expect(placeAxis(100, 140, 20, "end", 8)).toBe(148); // 140 + 8
  });

  it("centers over the anchor for center / span-all (no gap)", () => {
    expect(placeAxis(100, 140, 20, "center", 8)).toBe(110);
    expect(placeAxis(100, 140, 20, "span-all", 8)).toBe(110);
  });

  it("flushes spans to the opposite anchor edge", () => {
    expect(placeAxis(100, 140, 20, "span-start", 8)).toBe(120); // flush end
    expect(placeAxis(100, 140, 20, "span-end", 8)).toBe(100); // flush start
  });
});

describe("placeArea", () => {
  it("places a box below-and-centered for bottom", () => {
    const self: IBox = { x: 0, y: 0, w: 200, h: 120 };
    const anchor: IBox = { x: 300, y: 260, w: 120, h: 40 };
    expect(placeArea(self, anchor, resolveArea("bottom"), 8)).toEqual({
      x: 260, // (300+420)/2 − 100
      y: 308, // 300 + 8
    });
  });
});

describe("tryFallbacks — position-try", () => {
  const self: IBox = { x: 0, y: 0, w: 100, h: 100 };
  const anchor: IBox = { x: 400, y: 300, w: 40, h: 40 };
  const pref: Area = { block: "end", inline: "center" };

  it("keeps the preferred area when it fits", () => {
    expect(tryFallbacks(self, anchor, pref, 0, HUGE)).toEqual(pref);
  });

  it("flips the block axis when the preferred area overflows", () => {
    // boundary too short below the anchor → bottom overflows → flip to top
    const boundary: IBox = { x: 0, y: 0, w: 1000, h: 360 };
    expect(tryFallbacks(self, anchor, pref, 0, boundary)).toEqual({
      block: "start",
      inline: "center",
    });
  });
});

describe("shift — boundary clamp", () => {
  const self: IBox = { x: 0, y: 0, w: 100, h: 100 };

  it("clamps a box back inside the boundary", () => {
    expect(shift({ x: -20, y: 50 }, self, HUGE)).toEqual({ x: 0, y: 50 });
    expect(shift({ x: 50, y: 50 }, self, { x: 0, y: 0, w: 120, h: 1000 })).toEqual({
      x: 20, // 120 − 100
      y: 50,
    });
  });

  it("degrades to the leading edge when the box exceeds the boundary", () => {
    expect(shift({ x: 40, y: 0 }, self, { x: 0, y: 0, w: 50, h: 1000 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe("position_area — the reactive writer", () => {
  it("writes the placed coordinate to self.x/y", () => {
    const overlay = overlayBox(200, 120);
    const anchor: IBox = { x: 300, y: 260, w: 120, h: 40 };
    const stop = position_area(overlay, anchor, "bottom", 8, HUGE);
    expect(overlay.x).toBe(260);
    expect(overlay.y).toBe(308);
    stop();
    overlay.dispose();
  });

  it("flips + shifts to stay inside the boundary", () => {
    const overlay = overlayBox(100, 120);
    const anchor: IBox = { x: 300, y: 260, w: 120, h: 40 };
    // Short boundary below the anchor → "bottom" flips up to "top".
    const boundary: IBox = { x: 0, y: 0, w: 1000, h: 320 };
    const stop = position_area(overlay, anchor, "bottom", 8, boundary);
    expect(overlay.y).toBe(132); // 260 − 120 − 8 (flipped above)
    stop();
    overlay.dispose();
  });

  it("re-places when the anchor moves (reactive follow)", () => {
    const overlay = overlayBox(200, 120);
    const ax = signal(300);
    const anchor: IBox = {
      get x() {
        return ax();
      },
      y: 260, w: 120, h: 40,
    };
    const stop = position_area(overlay, anchor, "bottom", 0, HUGE);
    expect(overlay.x).toBe(260); // (300+420)/2 − 100
    ax(500); // anchor slides right
    expect(overlay.x).toBe(460); // (500+620)/2 − 100
    stop();
    overlay.dispose();
  });

  it("the pinned gate holds the box's own base as the fallback", () => {
    const overlay = overlayBox(200, 120);
    const anchor: IBox = { x: 300, y: 260, w: 120, h: 40 };
    const pinned = signal(false);
    overlay.x = 999; // a torn/dropped position
    overlay.y = 888;
    const stop = position_area(overlay, anchor, "bottom", 8, HUGE, pinned);
    // Unpinned → the writer no-ops, the base holds.
    expect(overlay.x).toBe(999);
    expect(overlay.y).toBe(888);
    // Re-pin → snaps back to the anchor.
    pinned(true);
    expect(overlay.x).toBe(260);
    expect(overlay.y).toBe(308);
    stop();
    overlay.dispose();
  });
});
