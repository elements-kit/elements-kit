import {
  anchor,
  type Box,
  clamp,
  edgeDrag,
  edgeSetup,
  type Frame,
  type FrameIO,
  type GestureSession,
  type MoveDeps,
  type Offset,
  type Point,
  type Pointer,
  PROJECTION_MS,
  type Rect,
  resist,
  type Resizer,
  slidePastRoom,
  type Snapshot,
} from "./gesture-model.ts";

/**
 * The markup gesture preset's sessions — ONE resize session for every
 * handle shape and one move session. In box space they are the same
 * idea: some edges follow the pointer, the rest stay pinned — an edge
 * word drives one dimension, a corner grip two, `data-draggable` moves
 * all four edges together (a translate). Each dimension is described by
 * a {@link Dim} and reduced by the same per-frame math; the differences
 * between the old per-shape sessions survive as `Dim` fields, not code
 * paths.
 */

/** Corner grip: minimum width / height (free mode). */
const MIN_RESIZE_W = 240;
const MIN_RESIZE_H = 160;

/** One driven dimension of a resize drag. */
interface Dim {
  /** The channel/frame keys this dimension writes. */
  size: "w" | "h";
  loc: "x" | "y";
  offset: "dx" | "dy";
  /** Pointer axis driving it. */
  pointer: keyof Point;
  axis: "width" | "height";
  startSize: number;
  /** Growth sign (handle grows toward the pointer) + anchoring. */
  sign: number;
  anchorSign: number;
  docked: boolean;
  /** Hard room from the anchored edge to the constraint. */
  hardMin: number;
  hardMax: number;
  /** Resolve bounds/rest through the strategy (and allow dismissal) —
   * false for the corner's free height clamp. */
  strategy: boolean;
  /** Below the lower bound: pin + slide toward the edge (edge handles,
   * the dismiss preview) or plain resistance (corner). */
  belowLo: "slide" | "resist";
}

/** An edge word — one driven dimension. */
function edgeDim(
  axis: "block" | "inline",
  side: "start" | "end",
  snap: Snapshot,
): Dim {
  const { sign, anchorSign, docked } = edgeSetup({
    axis,
    side,
    rect: snap.rect,
    constraint: snap.constraint,
    dir: snap.dir,
  });
  // Room from the *anchored* edge to the far constraint edge — not the
  // full constraint span. The anchored edge holds, so the surface can
  // only grow until the handle reaches the constraint; past that point
  // the CSS clamp would shove the anchored edge inward.
  const hardMax =
    axis === "block"
      ? anchorSign > 0
        ? snap.constraint.top + snap.constraint.height - snap.rect.top
        : snap.rect.bottom - snap.constraint.top
      : anchorSign > 0
        ? snap.constraint.left + snap.constraint.width - snap.rect.left
        : snap.rect.right - snap.constraint.left;
  const width = axis === "inline";
  return {
    size: width ? "w" : "h",
    loc: width ? "x" : "y",
    offset: width ? "dx" : "dy",
    pointer: width ? "x" : "y",
    axis: width ? "width" : "height",
    startSize: width ? snap.rect.width : snap.rect.height,
    sign,
    anchorSign,
    docked,
    hardMin: 0,
    hardMax,
    strategy: true,
    belowLo: "slide",
  };
}

/** A corner grip — two driven dimensions, opposite corner anchored. The
 * axes are asymmetric: the width follows the strategy (and alone decides
 * dismissal), the height is a free clamp that never dismisses. */
function cornerDims(
  block: "start" | "end",
  inline: "start" | "end",
  snap: Snapshot,
): [Dim, Dim] {
  const dir = snap.dir;
  const signX = (inline === "end" ? 1 : -1) * dir;
  const signY = block === "end" ? 1 : -1;
  const handleRight = (inline === "end") === (dir === 1);
  const maxW = handleRight
    ? snap.constraint.left + snap.constraint.width - snap.rect.left
    : snap.rect.right - snap.constraint.left;
  const maxH =
    block === "end"
      ? snap.constraint.top + snap.constraint.height - snap.rect.top
      : snap.rect.bottom - snap.constraint.top;
  return [
    {
      size: "w", loc: "x", offset: "dx", pointer: "x", axis: "width",
      startSize: snap.rect.width,
      sign: signX, anchorSign: signX, docked: false,
      hardMin: MIN_RESIZE_W, hardMax: maxW,
      strategy: true, belowLo: "resist",
    },
    {
      size: "h", loc: "y", offset: "dy", pointer: "y", axis: "height",
      startSize: snap.rect.height,
      sign: signY, anchorSign: signY, docked: false,
      hardMin: MIN_RESIZE_H, hardMax: maxH,
      strategy: false, belowLo: "resist",
    },
  ];
}

/**
 * The one resize session — edge handles (one `Dim`) and corner grips
 * (two) reduce identically per dimension: target size from the pointer
 * delta, rubber at the strategy's soft bounds, overshoot past the room
 * riding the slide channel, the opposite edge pinned by the location
 * shift (unless docked — then the CSS clamp holds it).
 */
export function resizeGesture(
  snap: Snapshot,
  resizer: Resizer,
  io: FrameIO,
  dims: Dim[],
): GestureSession {
  const boundsFor = (d: Dim): [number, number] =>
    d.strategy
      ? resizer.bounds({
          axis: d.axis,
          startSize: d.startSize,
          min: d.hardMin,
          max: d.hardMax,
        })
      : [d.hardMin, d.hardMax];

  const anchorAt = (d: Dim, size: number) =>
    anchor({
      axis: d.axis,
      center0: snap.center0,
      constraint: snap.constraint,
      anchorSign: d.anchorSign,
      startSize: d.startSize,
      size,
      docked: d.docked,
    });

  return {
    move(p) {
      const frame: Partial<Frame> = {};
      const offset: Offset = {};
      for (const d of dims) {
        const target = d.startSize + d.sign * (p.current[d.pointer] - p.start[d.pointer]);
        const [lo, hi] = boundsFor(d);
        const { size, slide } =
          d.belowLo === "slide"
            ? edgeDrag({ target, lo, hi, sign: d.sign, max: d.hardMax })
            : slidePastRoom(resist(target, lo, hi), d.hardMax, d.sign);
        frame[d.size] = size;
        const a = anchorAt(d, size);
        if (a !== null) frame[d.loc] = a;
        offset[d.offset] = slide;
      }
      io.sync({ frame, offset });
    },
    release(p) {
      const frame: Partial<Frame> = {};
      for (const d of dims) {
        const target = d.startSize + d.sign * (p.current[d.pointer] - p.start[d.pointer]);
        let size: number;
        if (d.strategy) {
          const r = resizer.rest(
            { axis: d.axis, startSize: d.startSize, min: d.hardMin, max: d.hardMax },
            { size: target, velocity: -d.sign * p.velocity[d.pointer] },
          );
          if (r === null) return io.dismiss();
          size = r;
        } else {
          size = clamp(target, d.hardMin, d.hardMax);
        }
        frame[d.size] = size;
        const a = anchorAt(d, size);
        if (a !== null) frame[d.loc] = a;
      }
      io.commit(frame);
    },
    cancel() {
      io.revert(["x", "y", "w", "h"]);
    },
  };
}

/** Move bounds on the box center — the same clamp the stylesheet applies
 * to the persisted location point (center floor = half the box). */
function moveBounds(rect: Box, constraint: Rect) {
  const minX = constraint.left + rect.width / 2;
  const minY = constraint.top + rect.height / 2;
  return {
    minX,
    minY,
    maxX: Math.max(constraint.left + constraint.width - rect.width / 2, minX),
    maxY: Math.max(constraint.top + constraint.height - rect.height / 2, minY),
  };
}

/** Whether a flicked move's projected center leaves the constraint. */
function projectedOutOfBounds(rect: Box, velocity: Point, constraint: Rect) {
  const px = rect.left + rect.width / 2 + velocity.x * PROJECTION_MS;
  const py = rect.top + rect.height / 2 + velocity.y * PROJECTION_MS;
  return (
    px < constraint.left ||
    px > constraint.left + constraint.width ||
    py < constraint.top ||
    py > constraint.top + constraint.height
  );
}

/**
 * The move session — x/y drag (all four edges travel together), 1:1
 * inside the constraint with rubber past it, flick off the constraint
 * to dismiss. The live delta rides the unclamped `--overlay-dx/-dy`;
 * the rested box center commits to the location channels.
 */
export function moveGesture(
  snap: Snapshot,
  deps: MoveDeps,
  io: FrameIO,
): GestureSession {
  const bounds = moveBounds(snap.rect, snap.constraint);
  const at = (p: Pointer) => ({
    x: snap.center0.x + (p.current.x - p.start.x),
    y: snap.center0.y + (p.current.y - p.start.y),
  });
  return {
    move(p) {
      const c = at(p);
      io.sync({
        offset: {
          dx: resist(c.x, bounds.minX, bounds.maxX) - snap.center0.x,
          dy: resist(c.y, bounds.minY, bounds.maxY) - snap.center0.y,
        },
      });
    },
    release(p) {
      if (
        deps.dismissible &&
        projectedOutOfBounds(deps.liveRect(), p.velocity, snap.constraint)
      ) {
        return io.dismiss();
      }
      const c = at(p);
      io.commit({
        x: clamp(c.x, bounds.minX, bounds.maxX) - snap.constraint.left,
        y: clamp(c.y, bounds.minY, bounds.maxY) - snap.constraint.top,
      });
    },
    cancel() {
      io.revert(["x", "y", "w", "h"]);
    },
  };
}

/** Build the session for an engaged zone (the preset's dispatcher). */
export function selectSession(
  key: "block" | "inline" | "resize" | "move",
  parsed: { block: "start" | "end" | null; inline: "start" | "end" | null },
  snapshot: Snapshot,
  resizer: Resizer,
  move: MoveDeps,
  io: FrameIO,
): GestureSession {
  if (key === "move") return moveGesture(snapshot, move, io);
  const dims =
    key === "resize"
      ? cornerDims(parsed.block!, parsed.inline!, snapshot)
      : key === "block"
        ? [edgeDim("block", parsed.block!, snapshot)]
        : [edgeDim("inline", parsed.inline!, snapshot)];
  return resizeGesture(snapshot, resizer, io, dims);
}
