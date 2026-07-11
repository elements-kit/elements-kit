import { describe, expect, it } from "vitest";
import { anchor, edgeSetup, parseResize, placementKind } from "./gesture.ts";
import type { PlainBox } from "./box.ts";
import { resist } from "./session.ts";

const CONSTRAINT = { x: 0, y: 0, w: 1024, h: 768 };

/** A box from origin + size, with the far edges filled in. */
function box(
  x: number,
  y: number,
  w: number,
  h: number,
): Required<PlainBox> {
  return { x, y, w, h };
}

describe("anchor (the single both-sides anchoring primitive)", () => {
  it("shifts the center half the size delta", () => {
    // size 300→400, anchorSign -1 → center moves up 50 → opposite edge pinned.
    expect(
      anchor({
        axis: "h",
        center0: { x: 0, y: 384 },
        constraint: CONSTRAINT,
        anchorSign: -1,
        startSize: 300,
        size: 400,
        docked: false,
      }),
    ).toBe(334);
  });

  it("returns null when docked (CSS clamp holds the edge)", () => {
    expect(
      anchor({
        axis: "h",
        center0: { x: 0, y: 384 },
        constraint: CONSTRAINT,
        anchorSign: -1,
        startSize: 300,
        size: 400,
        docked: true,
      }),
    ).toBeNull();
  });
});

describe("resist", () => {
  it("is identity within the bounds, rubber-bands past either", () => {
    expect(resist(300, 100, 500)).toBe(300);
    expect(resist(560, 100, 500)).toBe(500 + 60 / 3);
    expect(resist(40, 100, 500)).toBe(100 - 60 / 3);
  });
});

describe("parseResize", () => {
  it("splits edges, corners, and rejects junk", () => {
    expect(parseResize("block-start")).toEqual({
      block: "start",
      inline: null,
    });
    expect(parseResize("inline-end")).toEqual({ block: null, inline: "end" });
    expect(parseResize("end-start")).toEqual({ block: "end", inline: "start" });
    expect(parseResize("")).toEqual({ block: null, inline: null });
    expect(parseResize("nonsense")).toEqual({ block: null, inline: null });
  });
});

describe("placementKind", () => {
  it("names the gesture a handle's placement drives", () => {
    expect(placementKind("move")).toBe("move");
    expect(placementKind("end-end")).toBe("resize");
    expect(placementKind("start-start")).toBe("resize");
    expect(placementKind("block-start")).toBe("block");
    expect(placementKind("block-end")).toBe("block");
    expect(placementKind("inline-start")).toBe("inline");
    expect(placementKind("inline-end")).toBe("inline");
  });

  it("returns null for a non-gesture placement", () => {
    expect(placementKind("")).toBeNull();
    expect(placementKind("nonsense")).toBeNull();
  });
});

describe("edgeSetup", () => {
  it("block-start grows up, anchors the bottom", () => {
    const s = edgeSetup({
      axis: "block",
      side: "start",
      rect: box(0, 200, 480, 300), // bottom 500, not flush
      constraint: CONSTRAINT,
      dir: 1,
    });
    expect(s).toEqual({ sign: -1, anchorSign: -1, docked: false });
  });

  it("detects a docked edge flush with the constraint", () => {
    const s = edgeSetup({
      axis: "block",
      side: "start",
      rect: box(0, 468, 480, 300), // bottom 768 == constraint bottom
      constraint: CONSTRAINT,
      dir: 1,
    });
    expect(s.docked).toBe(true);
  });

  it("flips the inline sign in RTL", () => {
    const ltr = edgeSetup({
      axis: "inline",
      side: "end",
      rect: box(0, 0, 480, 300),
      constraint: CONSTRAINT,
      dir: 1,
    });
    const rtl = edgeSetup({
      axis: "inline",
      side: "end",
      rect: box(0, 0, 480, 300),
      constraint: CONSTRAINT,
      dir: -1,
    });
    expect(ltr.sign).toBe(1);
    expect(rtl.sign).toBe(-1);
  });
});

