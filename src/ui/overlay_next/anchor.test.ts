import { afterEach, describe, expect, it } from "vitest";
import { computed, signal } from "@/signals/index.ts";
import { anchor_length } from "./anchor.ts";
import type { BlockSide, InlineSide, Inset } from "./anchor.ts";
import type { IBox, IDirection } from "./box.ts";

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
