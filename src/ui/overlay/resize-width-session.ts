import {
  anchor,
  edgeDrag,
  edgeSetup,
  type FrameIO,
  type ResizeAxis,
  type Resizer,
  type Session,
  type Snapshot,
} from "./gesture-model.ts";

/**
 * Width resize — the inline-axis edge handle (drawers). Mirror of
 * `resizeHeightSession` on the width axis (the RTL sign flip is folded into
 * `edgeSetup`); the opposite edge is pinned, and below the lower bound the
 * surface slides via `--overlay-dx`. Self-contained: the width-axis wiring.
 */
export function resizeWidthSession(
  snap: Snapshot,
  resizer: Resizer,
  io: FrameIO,
  side: "start" | "end",
): Session {
  const startSize = snap.rect.width;
  const hardMax = snap.constraint.width;
  const ax: ResizeAxis = { axis: "width", startSize, min: 0, max: hardMax };
  const { sign, anchorSign, docked } = edgeSetup({
    axis: "inline",
    side,
    rect: snap.rect,
    constraint: snap.constraint,
    dir: snap.dir,
  });
  const anchorAt = (size: number) =>
    anchor({
      axis: "width",
      center0: snap.center0,
      constraint: snap.constraint,
      anchorSign,
      startSize,
      size,
      docked,
    });

  return {
    move(p) {
      const target = startSize + sign * (p.current.x - p.start.x);
      const [lo, hi] = resizer.bounds(ax);
      const { size, slide } = edgeDrag({ target, lo, hi, sign });
      const a = anchorAt(size);
      io.sync({
        frame: { w: size, ...(a !== null ? { x: a } : {}) },
        offset: { dx: slide },
      });
    },
    release(p) {
      const target = startSize + sign * (p.current.x - p.start.x);
      const r = resizer.rest(ax, { size: target, velocity: -sign * p.velocity.x });
      if (r === null) return io.dismiss();
      const a = anchorAt(r);
      io.commit({ w: r, ...(a !== null ? { x: a } : {}) });
    },
    cancel() {
      io.revert(["x", "y"]);
    },
  };
}
