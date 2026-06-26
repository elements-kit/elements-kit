import { describe, expect, it } from "vitest";
import type {
  Box,
  Frame,
  FrameIO,
  FramePatch,
  MoveDeps,
  Pointer,
  Snapshot,
} from "./gesture-model.ts";
import {
  moveBounds,
  moveOffset,
  moveRest,
  moveSession,
  projectedOutOfBounds,
} from "./move-session.ts";

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
function makeMove(rect: Box, dismissible = true): MoveDeps {
  return { dismissible, liveRect: () => rect };
}
function pointer(
  from: { x: number; y?: number },
  to: { x: number; y?: number },
  velocity = { x: 0, y: 0 },
): Pointer {
  const start = { x: from.x, y: from.y ?? 0 };
  const c = { x: to.x, y: to.y ?? 0 };
  return { start, prev: c, current: c, lastTime: 0, velocity };
}
function fakeIO() {
  const calls = {
    sync: [] as FramePatch[],
    commit: [] as Partial<Frame>[],
    dismiss: 0,
  };
  const io = {
    engage: () => {
      throw new Error("unused");
    },
    sync: (p: FramePatch) => calls.sync.push(p),
    commit: (f: Partial<Frame>) => calls.commit.push(f),
    dismiss: () => {
      calls.dismiss++;
    },
    revert: () => {},
  } satisfies FrameIO;
  return { io, calls };
}

describe("moveSession", () => {
  it("slides 1:1 inside the bounds", () => {
    const { io, calls } = fakeIO();
    const snap = makeSnapshot();
    moveSession(snap, makeMove(snap.rect), io).move(
      pointer({ x: 0, y: 0 }, { x: 50, y: 30 }),
    );
    expect(calls.sync.at(-1)!.offset).toEqual({ dx: 50, dy: 30 });
  });

  it("commits the location clamped, with no size key (no resizechange)", () => {
    const { io, calls } = fakeIO();
    const snap = makeSnapshot();
    moveSession(snap, makeMove(snap.rect), io).release(pointer({ x: 0 }, { x: 100 }));
    const f = calls.commit.at(-1)!;
    expect(f.x).toBe(612); // 512 + 100, inside maxX 784
    expect(f.w).toBeUndefined();
  });

  it("dismisses on a flick whose projection leaves the constraint", () => {
    const { io, calls } = fakeIO();
    const snap = makeSnapshot();
    moveSession(snap, makeMove(snap.rect), io).release(
      pointer({ x: 512 }, { x: 512 }, { x: -5, y: 0 }),
    );
    expect(calls.dismiss).toBe(1);
    expect(calls.commit.length).toBe(0);
  });
});

describe("moveBounds", () => {
  it("floors the center at half the box", () => {
    const b = moveBounds({
      rect: box(272, 234, 480, 300),
      constraint: CONSTRAINT,
    });
    expect(b.minX).toBe(240);
    expect(b.minY).toBe(150);
    expect(b.maxX).toBe(1024 - 240);
    expect(b.maxY).toBe(768 - 150);
  });
});

describe("moveOffset", () => {
  it("rubber-bands the live offset past the bounds", () => {
    const o = moveOffset({
      center0: { x: 512, y: 384 },
      client: { x: 2000, y: 384 },
      start: { x: 512, y: 384 },
      bounds: { minX: 240, maxX: 784, minY: 150, maxY: 618 },
    });
    expect(o.dx).toBe(784 + (2000 - 784) / 3 - 512);
    expect(o.dy).toBe(0);
  });
});

describe("moveRest", () => {
  it("clamps the rested location inside the constraint", () => {
    const r = moveRest({
      center0: { x: 512, y: 384 },
      client: { x: 2000, y: 384 },
      start: { x: 512, y: 384 },
      bounds: { minX: 240, maxX: 784, minY: 150, maxY: 618 },
      constraint: CONSTRAINT,
    });
    expect(r.x).toBe(784); // clamped to maxX, rect-relative
    expect(r.y).toBe(384);
  });
});

describe("projectedOutOfBounds", () => {
  const rect = box(450, 350, 480, 300); // center 690, 500
  it("is false for a slow drag staying inside", () => {
    expect(
      projectedOutOfBounds({
        rect,
        velocity: { x: 0.05, y: 0 },
        constraint: CONSTRAINT,
      }),
    ).toBe(false);
  });
  it("is true for a fast flick whose projection leaves the rect", () => {
    expect(
      projectedOutOfBounds({
        rect,
        velocity: { x: -5, y: 0 },
        constraint: CONSTRAINT,
      }),
    ).toBe(true);
  });
});
