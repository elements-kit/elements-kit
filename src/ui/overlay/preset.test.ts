import { describe, expect, it } from "vitest";
import {
  anchor,
  type Box,
  detectEngagement,
  edgeSetup,
  parseResize,
} from "./preset.ts";
import { resist } from "./session.ts";

const CONSTRAINT = { top: 0, left: 0, width: 1024, height: 768 };

/** A box from origin + size, with the far edges filled in. */
function box(left: number, top: number, width: number, height: number): Box {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

describe("anchor (the single both-sides anchoring primitive)", () => {
  it("shifts the center half the size delta", () => {
    // size 300→400, anchorSign -1 → center moves up 50 → opposite edge pinned.
    expect(
      anchor({
        axis: "height",
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
        axis: "height",
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

describe("detectEngagement", () => {
  const rect = box(100, 100, 480, 300); // right 580, bottom 400

  it("prioritises the corner grip", () => {
    expect(
      detectEngagement({
        block: "end",
        inline: "end",
        draggable: true,
        rect,
        pointer: { x: 575, y: 395 },
        dir: 1,
      }),
    ).toBe("resize");
  });

  it("engages the move strip for a plain draggable", () => {
    expect(
      detectEngagement({
        block: null,
        inline: null,
        draggable: true,
        rect,
        pointer: { x: 300, y: 110 },
        dir: 1,
      }),
    ).toBe("move");
  });

  it("carves the top-center pill out of a block-start move zone", () => {
    const args = {
      block: "start" as const,
      inline: null,
      draggable: true,
      rect,
      dir: 1 as const,
    };
    // top-center press → resize (the pill), not move
    expect(detectEngagement({ ...args, pointer: { x: 300, y: 110 } })).toBe(
      "block",
    );
    // top-start corner (the drag dot) → move
    expect(detectEngagement({ ...args, pointer: { x: 110, y: 110 } })).toBe(
      "move",
    );
  });

  it("falls through to the edge, then null", () => {
    expect(
      detectEngagement({
        block: "start",
        inline: null,
        draggable: false,
        rect,
        pointer: { x: 300, y: 200 },
        dir: 1,
      }),
    ).toBe("block");
    expect(
      detectEngagement({
        block: "end",
        inline: "end", // a corner, but pointer is in the middle & not draggable
        draggable: false,
        rect,
        pointer: { x: 300, y: 200 },
        dir: 1,
      }),
    ).toBeNull();
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

