import {
  type Box,
  type FrameIO,
  type MoveDeps,
  type Point,
  type Rect,
  resist,
  type Session,
  type Snapshot,
} from "./gesture-model.ts";
import { clamp, PROJECTION_MS } from "./resize-strategy.ts";

/** Move bounds on the box center — the same clamp the stylesheet applies to
 * the persisted location point (center floor = half the box). */
export function moveBounds(args: { rect: Box; constraint: Rect }): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const { rect, constraint } = args;
  const minX = constraint.left + rect.width / 2;
  const minY = constraint.top + rect.height / 2;
  return {
    minX,
    minY,
    maxX: Math.max(constraint.left + constraint.width - rect.width / 2, minX),
    maxY: Math.max(constraint.top + constraint.height - rect.height / 2, minY),
  };
}

/** Live move offset (`--overlay-dx/-dy`): 1:1 inside the bounds, rubber-band
 * resistance beyond them. */
export function moveOffset(args: {
  center0: Point;
  client: Point;
  start: Point;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}): { dx: number; dy: number } {
  const { center0, client, start, bounds } = args;
  return {
    dx:
      resist(center0.x + (client.x - start.x), bounds.minX, bounds.maxX) -
      center0.x,
    dy:
      resist(center0.y + (client.y - start.y), bounds.minY, bounds.maxY) -
      center0.y,
  };
}

/** Rested move location (rect-relative), clamped inside the bounds. */
export function moveRest(args: {
  center0: Point;
  client: Point;
  start: Point;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  constraint: Rect;
}): Point {
  const { center0, client, start, bounds, constraint } = args;
  const cx = clamp(center0.x + (client.x - start.x), bounds.minX, bounds.maxX);
  const cy = clamp(center0.y + (client.y - start.y), bounds.minY, bounds.maxY);
  return { x: cx - constraint.left, y: cy - constraint.top };
}

/** Whether a flicked move's projected center leaves the constraint (close). */
export function projectedOutOfBounds(args: {
  rect: Box;
  velocity: Point;
  constraint: Rect;
}): boolean {
  const { rect, velocity, constraint } = args;
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
 * Window move — x/y drag from the top strip, flick off the constraint to
 * dismiss. Doesn't resize: writes only `offset` live and the rested x/y on
 * release (so the I/O layer fires no `resizechange`).
 */
export function moveSession(
  snap: Snapshot,
  deps: MoveDeps,
  io: FrameIO,
): Session {
  const bounds = moveBounds({ rect: snap.rect, constraint: snap.constraint });
  return {
    move(p) {
      const { dx, dy } = moveOffset({
        center0: snap.center0,
        client: p.current,
        start: p.start,
        bounds,
      });
      io.sync({ offset: { dx, dy } });
    },
    release(p) {
      if (
        deps.dismissible &&
        projectedOutOfBounds({
          rect: deps.liveRect(),
          velocity: p.velocity,
          constraint: snap.constraint,
        })
      ) {
        return io.dismiss();
      }
      const r = moveRest({
        center0: snap.center0,
        client: p.current,
        start: p.start,
        bounds,
        constraint: snap.constraint,
      });
      io.commit({ x: r.x, y: r.y });
    },
    cancel() {
      io.revert([]);
    },
  };
}
