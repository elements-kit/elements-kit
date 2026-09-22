import { reactive } from "@/signals";

/** Which point of a box sits on an area's line: 0 its start edge, 1 its end
 * edge, anything between — CSS's `0%`…`100%`, SwiftUI's `UnitPoint`. */
export type Align = number;
export const Align = { start: 0, center: 0.5, end: 1 } as const;

/**
 * Space: its edges as viewport coordinates, y down — never insets, so `ymax`
 * is where the bottom edge is, not how far it is from anything. `undefined`
 * is open. As Blender's `rcti` and Core Graphics' `minX…maxY`.
 */
export interface Region {
  readonly xmin?: number;
  readonly xmax?: number;
  readonly ymin?: number;
  readonly ymax?: number;
}

/**
 * A {@link Region} and where a box sits in it, per axis: {@link Align}, or
 * `undefined` — free. {@link line} gives where it lands; each align needs
 * its edges:
 *
 *   0 (start)       min only     line = min
 *   1 (end)         max only     line = max
 *   between         both         line = min + (max − min) · align
 *
 * Missing one, the axis is free.
 */
export interface Area extends Region {
  readonly xalign?: Align;
  readonly yalign?: Align;
}

const open = (v: number) => (Number.isFinite(v) ? v : undefined);

/**
 * The space every bound shares: per edge, the tightest. `null` when they
 * share none — an empty region is reported, never crossed. Computed now:
 * call it where it should track (an `effect`, a `computed`).
 */
export function intersect(...regions: Region[]): Region | null {
  let xmin = -Infinity;
  let xmax = Infinity;
  let ymin = -Infinity;
  let ymax = Infinity;
  for (const r of regions) {
    if (r.xmin !== undefined) xmin = Math.max(xmin, r.xmin);
    if (r.xmax !== undefined) xmax = Math.min(xmax, r.xmax);
    if (r.ymin !== undefined) ymin = Math.max(ymin, r.ymin);
    if (r.ymax !== undefined) ymax = Math.min(ymax, r.ymax);
  }
  if (xmin > xmax || ymin > ymax) return null;
  return { xmin: open(xmin), xmax: open(xmax), ymin: open(ymin), ymax: open(ymax) };
}

/** A live cut area: cut again by more regions, still live. */
export interface CutArea extends Area {
  intersect(...regions: Region[]): CutArea;
}

/**
 * `area` cut by `regions`, live: each edge is read through the intersection
 * on every access, the aligns are the area's. With no shared room it keeps
 * its own edges, so `PositionTry` passes it over.
 */
export function cut(area: Area, regions: Region[]): CutArea {
  const edges = () => intersect(area, ...regions) ?? area;
  return {
    intersect: (...more) => cut(area, [...regions, ...more]),
    get xmin() {
      return edges().xmin;
    },
    get xmax() {
      return edges().xmax;
    },
    get ymin() {
      return edges().ymin;
    },
    get ymax() {
      return edges().ymax;
    },
    get xalign() {
      return area.xalign;
    },
    get yalign() {
      return area.yalign;
    },
  };
}

/** The room on one axis — `Infinity` when open. */
function length(min = -Infinity, max = Infinity): number {
  return max - min;
}

/** Whether `box` fits inside `room` by size — where it sits does not
 * matter. An open axis of the room fits anything. Box classes are regions. */
export function fits(room: Region, box: Region): boolean {
  return (
    length(room.xmin, room.xmax) >= length(box.xmin, box.xmax) &&
    length(room.ymin, room.ymax) >= length(box.ymin, box.ymax)
  );
}

/** One axis of {@link line}. */
function lineAxis(min?: number, max?: number, align?: Align): number | null {
  if (align === undefined) return null;
  if (min !== undefined && max !== undefined) return min + (max - min) * align;
  if (align === 0) return min ?? null;
  if (align === 1) return max ?? null;
  return null;
}

/**
 * The line each axis's aligned point lands on — `null` where free. Set
 * `OverlayBox.origin` to the area's aligns and write these to its `x/y`: the
 * box lands without being measured, and scales from the same point —
 * {@link place} does both.
 */
export function line(area: Area): { x: number | null; y: number | null } {
  return {
    x: lineAxis(area.xmin, area.xmax, area.xalign),
    y: lineAxis(area.ymin, area.ymax, area.yalign),
  };
}

/** Anything that lands on a point: an `OverlayBox`. */
interface Placeable {
  origin: { x?: Align; y?: Align };
  x: number;
  y: number;
}

/**
 * Lands `box` in `area` without measuring it: its origin on the area's
 * aligns, its x/y on {@link line}. A free axis is left alone. Run it in an
 * `effect` to follow the area.
 *
 *   effect(() => place(overlay, area));
 */
export function place(box: Placeable, area: Area): void {
  box.origin = { x: area.xalign, y: area.yalign };
  const { x, y } = line(area);
  if (x !== null) box.x = x;
  if (y !== null) box.y = y;
}

/** An {@link Area} you can write — every field reactive, so an `effect`
 * placing a box in it follows each write. */
export class MutableArea implements Area {
  @reactive() xmin: number | undefined;
  @reactive() xmax: number | undefined;
  @reactive() ymin: number | undefined;
  @reactive() ymax: number | undefined;
  @reactive() xalign: Align | undefined;
  @reactive() yalign: Align | undefined;

  constructor(area: Area = {}) {
    this.xmin = area.xmin;
    this.xmax = area.xmax;
    this.ymin = area.ymin;
    this.ymax = area.ymax;
    this.xalign = area.xalign;
    this.yalign = area.yalign;
  }
}
