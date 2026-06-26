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
import { resizeHeightSession } from "./resize-height-session.ts";
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
function pointer(from: { y: number }, to: { y: number }): Pointer {
  const start = { x: 0, y: from.y };
  const c = { x: 0, y: to.y };
  return { start, prev: c, current: c, lastTime: 0, velocity: { x: 0, y: 0 } };
}
/** Records what the session writes, so an effectful session is assertable. */
function fakeIO() {
  const calls = {
    sync: [] as FramePatch[],
    commit: [] as Partial<Frame>[],
    dismiss: 0,
    revert: [] as (keyof Frame)[][],
  };
  const io: FrameIO = {
    engage: () => {
      throw new Error("unused");
    },
    sync: (p) => calls.sync.push(p),
    commit: (f) => calls.commit.push(f),
    dismiss: () => {
      calls.dismiss++;
    },
    revert: (k) => calls.revert.push([...k]),
  };
  return { io, calls };
}

describe("resizeHeightSession", () => {
  it("grows up with the BOTTOM pinned (rect top 234, bottom 534)", () => {
    const { io, calls } = fakeIO();
    resizeHeightSession(makeSnapshot(), freeResizer, io, "start").move(
      pointer({ y: 300 }, { y: 200 }), // top handle up 100
    );
    const patch = calls.sync.at(-1)!;
    expect(patch.frame!.h).toBe(400);
    // wrong anchorSign → 634 and the bottom moves (both-sides bug).
    expect(CONSTRAINT.top + patch.frame!.y! + 400 / 2).toBe(534);
  });

  it("commits height + anchored y on release, bottom still pinned", () => {
    const { io, calls } = fakeIO();
    resizeHeightSession(makeSnapshot(), freeResizer, io, "start").release(
      pointer({ y: 300 }, { y: 200 }),
    );
    expect(calls.dismiss).toBe(0);
    const f = calls.commit.at(-1)!;
    expect(f.h).toBe(400);
    expect(CONSTRAINT.top + f.y! + f.h! / 2).toBe(534);
  });

  it("caps height at the room to the anchored edge, not the full constraint", () => {
    const { io, calls } = fakeIO();
    // rect top 234 in a 768 constraint → 534 of room to the block-end edge.
    // Dragging far past it must rest at the room, keeping the TOP edge pinned.
    resizeHeightSession(makeSnapshot(), freeResizer, io, "end").release(
      pointer({ y: 0 }, { y: 1500 }),
    );
    const f = calls.commit.at(-1)!;
    expect(f.h).toBe(534);
    expect(CONSTRAINT.top + f.y! - 534 / 2).toBe(234);
  });

  it("pins to lo and slides the surface away below the lower bound", () => {
    const { io, calls } = fakeIO();
    const snapped: Resizer = {
      bounds: () => [200, 768],
      rest: (a, drag) => clamp(drag.size, a.min, a.max),
    };
    resizeHeightSession(makeSnapshot(), snapped, io, "start").move(
      pointer({ y: 0 }, { y: 150 }), // shrink past lo
    );
    const patch = calls.sync.at(-1)!;
    expect(patch.frame!.h).toBe(200);
    expect(patch.offset).toEqual({ dy: 50 }); // -sign*(lo-target) = 200-150
  });
});
