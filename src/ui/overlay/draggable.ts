import { onCleanup } from "@/signals/index.ts";
import type { Region } from "./constraint.ts";
import type { Space } from "./detents.ts";
import { type Point, updateVelocity } from "./gesture-model.ts";
import { PROJECTION_MS } from "./resize-strategy.ts";
import type { Effect } from "./rubber.ts";

/**
 * The drag service — moves a target element through a space. Generic by
 * design: drag any positioned element by any handle. For overlays, the
 * target is the anchor element from `anchor()` — dragging the anchor
 * drags the overlay, with no overlay state involved.
 *
 * The pipeline runs per axis: live values go through each effect's
 * `during` (e.g. `rubber()` resistance at the space edges); on release
 * the value goes through each `settle`, then snaps to the space's
 * numeric stops when a `detents()` space is given (`null` from a settle
 * = dismiss signal, surfaced on the `dragend` detail). Events on the
 * target: `dragmove` (`{x, y}`) every move, `dragend`
 * (`{x, y, velocity, rest}`) on release.
 *
 * First pointer-down tears a `data-follow` pin (the `anchor()` contract):
 * the target freezes at its current rect and the pointer takes over.
 */

export interface DragService {
  /** Move the target programmatically (through the `during` effects). */
  update(point: { x: number; y: number }): void;
  /** Wire the pointer plumbing to a handle. */
  attach(handle: Element): { dispose(): void };
  dispose(): void;
  [Symbol.dispose](): void;
}

const isSpace = (s: Region | Space): s is Space => "positions" in s;

export function draggable(
  target: HTMLElement,
  space?: Region | Space,
  ...effects: Effect[]
): DragService {
  const region = space && isSpace(space) ? space.region : space;

  const boundsFor = (axis: "x" | "y"): [number, number] => {
    if (!region) {
      return axis === "x" ? [0, window.innerWidth] : [0, window.innerHeight];
    }
    return axis === "x"
      ? [region.left(), region.left() + region.width()]
      : [region.top(), region.top() + region.height()];
  };

  const during = (value: number, axis: "x" | "y"): number => {
    const bounds = boundsFor(axis);
    let v = value;
    for (const e of effects) if (e.during) v = e.during(v, bounds);
    return v;
  };

  const write = (x: number, y: number) => {
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
  };

  const emit = (type: string, detail: unknown) =>
    target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));

  /** Tear a `data-follow` pin: freeze the current rect inline (inline
   * wins over the pin rule — no jump), then drop the pin machinery. */
  const takeOver = (): { left: number; top: number } => {
    const rect = target.getBoundingClientRect();
    write(rect.left, rect.top);
    if (target.hasAttribute("data-follow")) {
      target.style.width = `${rect.width}px`;
      target.style.height = `${rect.height}px`;
      target.removeAttribute("data-follow");
      target.style.removeProperty("position-anchor");
    }
    return { left: rect.left, top: rect.top };
  };

  const settleAxis = (
    value: number,
    velocity: number,
    axis: "x" | "y",
  ): number | null => {
    const bounds = boundsFor(axis);
    let v = value;
    for (const e of effects) {
      if (!e.settle) continue;
      const s = e.settle(v, velocity, bounds);
      if (s === null) return null;
      v = s;
    }
    if (space && isSpace(space)) {
      const stops = space.positions(axis === "x" ? "width" : "height");
      if (stops.length && region) {
        const origin = axis === "x" ? region.left() : region.top();
        const projected = v + velocity * PROJECTION_MS;
        let best = origin + stops[0];
        for (const stop of stops) {
          const candidate = origin + stop;
          if (Math.abs(candidate - projected) < Math.abs(best - projected))
            best = candidate;
        }
        v = best;
      }
    }
    return v;
  };

  const attachments: Array<() => void> = [];

  const attach = (handle: Element) => {
    let engaged: {
      start: { left: number; top: number };
      down: Point;
      tracker: { prev: Point; lastTime: number; velocity: Point };
      transition: string;
    } | null = null;

    const onDown = (event: PointerEvent) => {
      if (engaged || event.button !== 0) return;
      // Leave interactive elements alone — capturing the pointer would
      // retarget the pointerup to the handle and swallow their click.
      const at = event.target as Element | null;
      if (
        at?.closest("button, a, label, input, select, textarea, [contenteditable]")
      ) {
        return;
      }
      const start = takeOver();
      engaged = {
        start,
        down: { x: event.clientX, y: event.clientY },
        tracker: {
          prev: { x: event.clientX, y: event.clientY },
          lastTime: event.timeStamp,
          velocity: { x: 0, y: 0 },
        },
        transition: target.style.transitionProperty,
      };
      target.style.transitionProperty = "none";
      handle.setPointerCapture(event.pointerId);
    };

    const onMove = (event: PointerEvent) => {
      if (!engaged) return;
      const client = { x: event.clientX, y: event.clientY };
      engaged.tracker.velocity = updateVelocity(
        engaged.tracker,
        client,
        event.timeStamp,
      );
      engaged.tracker.prev = client;
      engaged.tracker.lastTime = event.timeStamp;
      const x = during(engaged.start.left + (client.x - engaged.down.x), "x");
      const y = during(engaged.start.top + (client.y - engaged.down.y), "y");
      write(x, y);
      emit("dragmove", { x, y });
    };

    const onUp = (event: PointerEvent) => {
      if (!engaged) return;
      const { start, down, tracker, transition } = engaged;
      engaged = null;
      target.style.transitionProperty = transition;
      const raw = {
        x: start.left + (event.clientX - down.x),
        y: start.top + (event.clientY - down.y),
      };
      const x = settleAxis(raw.x, tracker.velocity.x, "x");
      const y = settleAxis(raw.y, tracker.velocity.y, "y");
      const rest = x === null || y === null ? null : { x, y };
      if (rest) write(rest.x, rest.y);
      emit("dragend", { ...raw, velocity: tracker.velocity, rest });
    };

    handle.addEventListener("pointerdown", onDown as EventListener);
    handle.addEventListener("pointermove", onMove as EventListener);
    handle.addEventListener("pointerup", onUp as EventListener);
    handle.addEventListener("pointercancel", onUp as EventListener);
    const dispose = () => {
      handle.removeEventListener("pointerdown", onDown as EventListener);
      handle.removeEventListener("pointermove", onMove as EventListener);
      handle.removeEventListener("pointerup", onUp as EventListener);
      handle.removeEventListener("pointercancel", onUp as EventListener);
    };
    attachments.push(dispose);
    return { dispose };
  };

  const update = (point: { x: number; y: number }) => {
    takeOver();
    const x = during(point.x, "x");
    const y = during(point.y, "y");
    write(x, y);
    emit("dragmove", { x, y });
  };

  const dispose = () => {
    for (const detach of attachments.splice(0)) detach();
  };
  onCleanup(dispose);

  return { update, attach, dispose, [Symbol.dispose]: dispose };
}
