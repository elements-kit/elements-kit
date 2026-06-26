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
import { resizeWidthSession } from "./resize-width-session.ts";
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
function pointer(from: { x: number }, to: { x: number }): Pointer {
  const start = { x: from.x, y: 0 };
  const c = { x: to.x, y: 0 };
  return { start, prev: c, current: c, lastTime: 0, velocity: { x: 0, y: 0 } };
}
function fakeIO() {
  const calls = { sync: [] as FramePatch[], commit: [] as Partial<Frame>[] };
  const io = {
    engage: () => {
      throw new Error("unused");
    },
    sync: (p: FramePatch) => calls.sync.push(p),
    commit: (f: Partial<Frame>) => calls.commit.push(f),
    dismiss: () => {},
    revert: () => {},
  } satisfies FrameIO;
  return { io, calls };
}

describe("resizeWidthSession", () => {
  it("grows right with the LEFT edge pinned (rect left 272)", () => {
    const { io, calls } = fakeIO();
    resizeWidthSession(makeSnapshot(), freeResizer, io, "end").move(
      pointer({ x: 200 }, { x: 260 }), // +60
    );
    const patch = calls.sync.at(-1)!;
    expect(patch.frame!.w).toBe(540);
    expect(CONSTRAINT.left + patch.frame!.x! - 540 / 2).toBe(272);
  });

  it("omits the anchor channel when docked", () => {
    const { io, calls } = fakeIO();
    // rect flush with the constraint's inline-end edge → docked.
    resizeWidthSession(makeSnapshot(box(0, 234, 480, 300)), freeResizer, io, "end").move(
      pointer({ x: 0 }, { x: 60 }),
    );
    expect(calls.sync.at(-1)!.frame!.x).toBeUndefined();
  });
});
