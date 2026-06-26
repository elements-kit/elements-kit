import { describe, expect, it } from "vitest";
import type {
  Box,
  Frame,
  FrameIO,
  FramePatch,
  Pointer,
  Resizer,
  Snapshot,
} from "./gesture-model.ts";
import { cornerBounds, cornerSetup, resizeSession } from "./resize-session.ts";
import { clamp } from "./resize-strategy.ts";

const CONSTRAINT = { top: 0, left: 0, width: 1024, height: 768 };

function box(left: number, top: number, w: number, h: number): Box {
  return { left, top, width: w, height: h, right: left + w, bottom: top + h };
}
function makeSnapshot(rect: Box = box(272, 234, 480, 300)): Snapshot {
  return {
    constraint: CONSTRAINT,
    rect,
    center0: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    dir: 1,
  };
}
const freeResizer: Resizer = {
  bounds: (a) => [a.min, a.max],
  rest: (a, drag) => clamp(drag.size, a.min, a.max),
};
/** Strategy that nulls a sub-min size — proves only width can dismiss. */
const dismissing: Resizer = {
  bounds: (a) => [a.min, a.max],
  rest: (a, drag) => (drag.size < a.min / 2 ? null : clamp(drag.size, a.min, a.max)),
};
function pointer(
  from: { x: number; y?: number },
  to: { x: number; y?: number },
): Pointer {
  const start = { x: from.x, y: from.y ?? 0 };
  const c = { x: to.x, y: to.y ?? 0 };
  return { start, prev: c, current: c, lastTime: 0, velocity: { x: 0, y: 0 } };
}
function fakeIO() {
  const calls = { commit: [] as Partial<Frame>[], dismiss: 0 };
  const io = {
    engage: () => {
      throw new Error("unused");
    },
    sync: (_p: FramePatch) => {},
    commit: (f: Partial<Frame>) => calls.commit.push(f),
    dismiss: () => {
      calls.dismiss++;
    },
    revert: () => {},
  } satisfies FrameIO;
  return { io, calls };
}

describe("resizeSession (asymmetric axes)", () => {
  it("pins the opposite corner (top-left) for an end-end grip", () => {
    const { io, calls } = fakeIO();
    resizeSession(makeSnapshot(), freeResizer, io, "end", "end").release(
      pointer({ x: 0, y: 0 }, { x: 40, y: 40 }),
    );
    const f = calls.commit.at(-1)! as { w: number; h: number; x: number; y: number };
    expect(f.x - f.w / 2).toBe(272); // left stays put
    expect(f.y - f.h / 2).toBe(234); // top stays put
  });

  it("height is a free clamp, never the strategy", () => {
    const { io, calls } = fakeIO();
    resizeSession(makeSnapshot(), dismissing, io, "end", "end").release(
      pointer({ x: 0, y: 0 }, { x: 40, y: 40 }),
    );
    expect(calls.dismiss).toBe(0);
    expect(calls.commit.at(-1)!.h).toBe(340); // 300 + 40, clamped — not dismissed
  });

  it("dismisses from the WIDTH axis only", () => {
    const { io, calls } = fakeIO();
    resizeSession(makeSnapshot(), dismissing, io, "end", "end").release(
      pointer({ x: 1000 }, { x: 0 }), // width shrinks far past min
    );
    expect(calls.dismiss).toBe(1);
    expect(calls.commit.length).toBe(0);
  });
});

describe("cornerSetup", () => {
  it("derives signs + the physical corner", () => {
    expect(cornerSetup({ block: "end", inline: "end", dir: 1 })).toEqual({
      signX: 1,
      signY: 1,
      handleRight: true,
    });
    expect(cornerSetup({ block: "start", inline: "start", dir: 1 })).toEqual({
      signX: -1,
      signY: -1,
      handleRight: false,
    });
  });
});

describe("cornerBounds", () => {
  it("bounds the size to the constraint from the anchored corner", () => {
    const b = cornerBounds({
      rect: box(100, 100, 480, 300), // right 580, bottom 400
      constraint: CONSTRAINT,
      block: "end",
      handleRight: true,
    });
    expect(b.maxW).toBe(1024 - 100); // constraint right - rect.left
    expect(b.maxH).toBe(768 - 100); // constraint bottom - rect.top
    expect(b.hardMin).toBe(240);
  });
});
