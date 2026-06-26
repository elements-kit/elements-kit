import {
  anchor,
  type Box,
  type Frame,
  type FrameIO,
  type Rect,
  type ResizeAxis,
  resist,
  type Resizer,
  type Session,
  type Snapshot,
} from "./gesture-model.ts";
import { clamp } from "./resize-strategy.ts";

/** Corner resize: minimum width / height (free mode). */
const MIN_RESIZE_W = 240;
const MIN_RESIZE_H = 160;

/** Corner-resize signs + which physical corner the handle is on. */
export function cornerSetup(args: {
  block: "start" | "end";
  inline: "start" | "end";
  dir: 1 | -1;
}): { signX: number; signY: number; handleRight: boolean } {
  const { block, inline, dir } = args;
  return {
    signX: (inline === "end" ? 1 : -1) * dir,
    signY: block === "end" ? 1 : -1,
    handleRight: (inline === "end") === (dir === 1),
  };
}

/**
 * Corner-resize bounds: the opposite corner stays anchored, so the room
 * toward the handle-side constraint edges caps the size (the grip never
 * leaves the constraint). The strategy bounds the width; the height is a
 * free clamp.
 */
export function cornerBounds(args: {
  rect: Box;
  constraint: Rect;
  block: "start" | "end";
  handleRight: boolean;
}): { maxW: number; maxH: number; hardMin: number; hardMax: number } {
  const { rect, constraint, block, handleRight } = args;
  const maxW = handleRight
    ? constraint.left + constraint.width - rect.left
    : rect.right - constraint.left;
  const maxH =
    block === "end"
      ? constraint.top + constraint.height - rect.top
      : rect.bottom - constraint.top;
  return { maxW, maxH, hardMin: MIN_RESIZE_W, hardMax: maxW };
}

/**
 * Corner grip — free 2D resize, opposite corner anchored. The two axes are
 * asymmetric: the width follows the strategy (and alone decides dismissal),
 * the height is a free clamp `[MIN_RESIZE_H, maxH]` that never dismisses.
 */
export function resizeSession(
  snap: Snapshot,
  resizer: Resizer,
  io: FrameIO,
  block: "start" | "end",
  inline: "start" | "end",
): Session {
  const { signX, signY, handleRight } = cornerSetup({
    block,
    inline,
    dir: snap.dir,
  });
  const { maxH, hardMin, hardMax } = cornerBounds({
    rect: snap.rect,
    constraint: snap.constraint,
    block,
    handleRight,
  });
  const startW = snap.rect.width;
  const startH = snap.rect.height;
  const ax: ResizeAxis = { axis: "width", startSize: startW, min: hardMin, max: hardMax };

  const frameFor = (w: number, h: number): Frame => ({
    w,
    h,
    x: anchor({
      axis: "width",
      center0: snap.center0,
      constraint: snap.constraint,
      anchorSign: signX,
      startSize: startW,
      size: w,
      docked: false,
    })!,
    y: anchor({
      axis: "height",
      center0: snap.center0,
      constraint: snap.constraint,
      anchorSign: signY,
      startSize: startH,
      size: h,
      docked: false,
    })!,
  });

  return {
    move(p) {
      const [lo, hi] = resizer.bounds(ax);
      const w = resist(startW + signX * (p.current.x - p.start.x), lo, hi);
      const h = resist(
        startH + signY * (p.current.y - p.start.y),
        MIN_RESIZE_H,
        maxH,
      );
      io.sync({ frame: frameFor(w, h) });
    },
    release(p) {
      const w = resizer.rest(ax, {
        size: startW + signX * (p.current.x - p.start.x),
        velocity: -p.velocity.x * signX,
      });
      if (w === null) return io.dismiss();
      const h = clamp(
        startH + signY * (p.current.y - p.start.y),
        MIN_RESIZE_H,
        maxH,
      );
      io.commit(frameFor(w, h));
    },
    cancel() {
      io.revert(["x", "y", "w", "h"]);
    },
  };
}
