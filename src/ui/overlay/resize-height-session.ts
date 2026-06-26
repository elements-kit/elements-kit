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
 * Height resize — the block-axis edge handle (sheets). One edge moves toward
 * the pointer; the opposite edge is pinned by the location shift, or held by
 * the CSS clamp when docked. Below the lower bound the surface slides away via
 * `--overlay-dy`. Self-contained: the height-axis wiring lives here.
 */
export function resizeHeightSession(
  snap: Snapshot,
  resizer: Resizer,
  io: FrameIO,
  side: "start" | "end",
): Session {
  const startSize = snap.rect.height;
  const { sign, anchorSign, docked } = edgeSetup({
    axis: "block",
    side,
    rect: snap.rect,
    constraint: snap.constraint,
    dir: snap.dir,
  });
  // Room from the *anchored* edge to the far constraint edge — not the full
  // constraint height. The anchored edge holds, so the surface can only grow
  // until the handle reaches the constraint; using the full height lets the
  // size pass that point, where `max-height` caps the box and the CSS location
  // clamp saturates and shoves the anchored edge inward. Mirrors `cornerBounds`.
  const hardMax =
    anchorSign > 0
      ? snap.constraint.top + snap.constraint.height - snap.rect.top
      : snap.rect.bottom - snap.constraint.top;
  const ax: ResizeAxis = { axis: "height", startSize, min: 0, max: hardMax };
  const anchorAt = (size: number) =>
    anchor({
      axis: "height",
      center0: snap.center0,
      constraint: snap.constraint,
      anchorSign,
      startSize,
      size,
      docked,
    });

  return {
    move(p) {
      const target = startSize + sign * (p.current.y - p.start.y);
      const [lo, hi] = resizer.bounds(ax);
      const { size, slide } = edgeDrag({ target, lo, hi, sign, max: hardMax });
      const a = anchorAt(size);
      io.sync({
        frame: { h: size, ...(a !== null ? { y: a } : {}) },
        offset: { dy: slide },
      });
    },
    release(p) {
      const target = startSize + sign * (p.current.y - p.start.y);
      const r = resizer.rest(ax, { size: target, velocity: -sign * p.velocity.y });
      if (r === null) return io.dismiss();
      const a = anchorAt(r);
      io.commit({ h: r, ...(a !== null ? { y: a } : {}) });
    },
    cancel() {
      io.revert(["x", "y"]);
    },
  };
}
