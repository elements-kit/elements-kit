/**
 * Gestures over `Motion` — two layers:
 *
 * - Pure shapers (`rubber`, `detent`, `snap`, `spring`, `HANDLES`): stateless
 *   number math, no DOM — run in the box projection or the settle.
 * - Gesture binders (`Draggable`, `Resizable`): wire pointer events on an
 *   element to a reactive `ElementBox`, driving its `displacement` live and
 *   settling to a detent on release. The one DOM-touching, stateful piece.
 *
 * `apply` isn't a shaper — it's the box's geometry fold. Gestures decide the
 * delta; the box commits it. Velocities are `Motion`'s px/ms throughout.
 */

import { effect } from "@/signals";
import { scope } from "@/signals/scope";
import { ElementBox } from "./box";
import { Motion } from "./motion";

/** A pure display-time shaper: raw scalar → constrained scalar. */
export type Modifier = (value: number) => number;

/** Left-to-right: `compose(a, b)(x)` = `b(a(x))`. */
export function compose(...mods: Modifier[]): Modifier {
  return (x) => mods.reduce((v, mod) => mod(v), x);
}

// ── rubber ──────────────────────────────────────────────────────────────

/** iOS rubber-band curve: sub-linear overshoot, asymptotes to
 * `dimension * constant` — pull but never escape. */
function resist(
  overshoot: number,
  dimension: number,
  constant: number,
): number {
  return (
    (overshoot * dimension * constant) / (dimension + constant * overshoot)
  );
}

/** Elastic resistance past `[min, max]`. The true value stays in `Motion`, so
 * release springs back cleanly. `dimension` = axis extent; `constant` = iOS
 * tension (higher = looser). */
export function rubber(
  min: number,
  max: number,
  dimension: number,
  constant = 0.55,
): Modifier {
  return (x) =>
    x < min
      ? min - resist(min - x, dimension, constant)
      : x > max
        ? max + resist(x - max, dimension, constant)
        : x;
}

// ── detents ─────────────────────────────────────────────────────────────

/** The nearest detent to `value`. */
export function nearest(value: number, points: number[]): number {
  return points.reduce((a, b) =>
    Math.abs(b - value) < Math.abs(a - value) ? b : a,
  );
}

/** Magnetic pull toward the nearest detent during a drag (0 = free, 1 = snap). */
export function detent(points: number[], strength = 0): Modifier {
  return (x) => x + (nearest(x, points) - x) * strength;
}

/** Release target: project by velocity (`reach` ms of carry), then nearest detent. */
export function snap(
  value: number,
  velocity: number,
  points: number[],
  reach = 150,
): number {
  return nearest(value + velocity * reach, points);
}

// ── resize handles ──────────────────────────────────────────────────────

/** How a resize handle maps the pointer delta onto a box's channels:
 * `x`/`y` move the origin (the edges that follow the pointer), `w`/`h` resize.
 * Coefficients are −1 | 0 | 1 on the pointer's (dx, dy). */
export interface Handle {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
  w: -1 | 0 | 1;
  h: -1 | 0 | 1;
}

/** The eight resize handles by compass point. A `top left` transform-origin
 * renders them all: a moving edge drives x/y so `translate` shifts the origin,
 * and `scale` grows from it to the fixed edge. */
export const HANDLES = {
  e: { x: 0, y: 0, w: 1, h: 0 },
  w: { x: 1, y: 0, w: -1, h: 0 },
  s: { x: 0, y: 0, w: 0, h: 1 },
  n: { x: 0, y: 1, w: 0, h: -1 },
  se: { x: 0, y: 0, w: 1, h: 1 },
  sw: { x: 1, y: 0, w: -1, h: 1 },
  ne: { x: 0, y: 1, w: 1, h: -1 },
  nw: { x: 1, y: 1, w: -1, h: -1 },
} satisfies Record<string, Handle>;

// ── the settle ──────────────────────────────────────────────────────────

export interface SpringOptions {
  /** Higher = snappier. */
  stiffness?: number;
  /** Higher = settles sooner, less overshoot. */
  damping?: number;
  /** Initial velocity in px/ms (`Motion`'s unit). */
  velocity?: number;
  /** Rest threshold in px. */
  epsilon?: number;
}

/** Animate `from → to` on a spring: `onStep` each frame, `onSettle` at rest.
 * Returns `stop()`. The only stateful, time-driven piece — it owns the rAF loop. */
export function spring(
  from: number,
  to: number,
  onStep: (value: number) => void,
  {
    stiffness = 180,
    damping = 22,
    velocity = 0,
    epsilon = 0.1,
  }: SpringOptions = {},
  onSettle?: () => void,
): () => void {
  let x = from;
  let v = velocity * 1000; // px/ms → px/s for the integrator
  let last = performance.now();
  let frame = requestAnimationFrame(tick);

  function tick(now: number): void {
    const dt = Math.min((now - last) / 1000, 1 / 30); // clamp tab-stall spikes
    last = now;
    // Semi-implicit Euler: velocity from the restoring force, then position.
    v += (-stiffness * (x - to) - damping * v) * dt;
    x += v * dt;

    if (Math.abs(x - to) < epsilon && Math.abs(v) < epsilon) {
      onStep(to);
      onSettle?.();
      return;
    }
    onStep(x);
    frame = requestAnimationFrame(tick);
  }

  return () => cancelAnimationFrame(frame);
}

// ── gesture binders ───────────────────────────────────────────────────────

/**
 * The shared pointer→box machine: capture the pointer, accumulate its motion,
 * drive the box's live `displacement` through {@link drive} every frame, and on
 * release hand each moved channel to {@link settle} (snap to a detent, spring
 * the leftover to 0). Re-grabbing mid-settle cancels the springs and folds the
 * leftover into the base first, so there is never a jump. Subclasses choose
 * which channels move and how.
 *
 * `on` defaults to the box's own element but may differ — the resize handle
 * captures the pointer while the OVERLAY box is what actually resizes.
 */
abstract class PointerGesture {
  protected motion?: { x: Motion; y: Motion };
  readonly #on: HTMLElement;
  readonly #settle = new Set<() => void>();
  readonly #disposables = new Set<() => void>();

  #live?: () => void;

  constructor(
    protected readonly box: ElementBox,
    on: HTMLElement = box.element,
  ) {
    this.#on = on;
    on.addEventListener("pointerdown", this.#down);
    on.addEventListener("pointermove", this.#move);
    on.addEventListener("pointerup", this.#up);
    on.addEventListener("pointercancel", this.#cancel);
    this.#disposables.add(() => {
      on.removeEventListener("pointerdown", this.#down);
      on.removeEventListener("pointermove", this.#move);
      on.removeEventListener("pointerup", this.#up);
      on.removeEventListener("pointercancel", this.#cancel);
    });
  }

  #down = (e: PointerEvent) => {
    this.#on.setPointerCapture(e.pointerId);
    this.#stopSettle(); // cancel any settle in progress …
    this.box.displacement.apply(); // … and fold its leftover into base — no jump
    this.motion = { x: new Motion(e.clientX), y: new Motion(e.clientY) };
    this.onStart?.();
    const [, stop] = scope(() => {
      effect(() => {
        if (!this.motion) return;
        this.drive(this.motion.x.displacement, this.motion.y.displacement);
      });
    });
    this.#live = stop;
  };

  #move = (e: PointerEvent) => {
    if (!this.motion || !this.#on.hasPointerCapture(e.pointerId)) return;
    this.motion.x.value = e.clientX; // feed the per-frame delta; Motion sums it
    this.motion.y.value = e.clientY;
  };

  #up = (e: PointerEvent) => {
    if (!this.motion) return;
    try {
      this.#on.releasePointerCapture(e.pointerId);
    } catch {}
    this.#live?.(); // stop the live projection before settling
    this.release(this.motion.x.velocity, this.motion.y.velocity);
    this.motion = undefined;
  };

  #cancel = () => {
    this.#live?.();
    this.motion = undefined;
    this.box.displacement.clear();
  };

  /**
   * Commit-up-front settle for one channel: the base jumps to the snapped
   * detent NOW (so `place()` reflows against the final value), the delta holds
   * the leftover pixels, then springs to 0 — the fold is implicit (the delta
   * reaches 0 at the already-committed target). {@link onSettle} fires once
   * every channel has come to rest.
   */
  protected settle(
    k: "x" | "y" | "w" | "h",
    detents: number[],
    velocity: number,
  ) {
    const o = this.box[k]; // current visual (base + delta)
    const t = snap(o, velocity, detents);
    this.box[k] = t; // base ← detent
    this.box.displacement[k] = o - t; // delta ← leftover (no visual change)
    let stop!: () => void;
    stop = spring(
      this.box.displacement[k],
      0,
      (d) => (this.box.displacement[k] = d),
      { velocity },
      () => {
        this.#settle.delete(stop);
        if (this.#settle.size === 0) this.onSettle?.();
      },
    );
    this.#settle.add(stop);
  }

  #stopSettle() {
    this.#settle.forEach((s) => s());
    this.#settle.clear();
  }

  /** Map the pointer's accumulated (dx, dy) onto the box's live displacement. */
  protected abstract drive(dx: number, dy: number): void;
  /** Snap + spring each driven channel from its release velocity. */
  protected abstract release(vx: number, vy: number): void;
  /** Optional side effects — e.g. blur on start, clear once every axis rests. */
  protected onStart?(): void;
  protected onSettle?(): void;

  dispose() {
    this.#stopSettle();
    this.#live?.();
    this.#disposables.forEach((d) => d());
    this.#disposables.clear();
  }
  [Symbol.dispose]() {
    this.dispose();
  }
}

/** Drag a box's position; release snaps x/y to their detent grids, or — when
 * `detents` is omitted — folds the drag into the base for a free move (no
 * snap), the tear-off case. */
export class Draggable extends PointerGesture {
  readonly #detents?: { x: number[]; y: number[] };

  constructor(
    box: ElementBox,
    detents?: { x: number[]; y: number[] },
    on?: HTMLElement,
  ) {
    super(box, on);
    this.#detents = detents;
  }

  protected drive(dx: number, dy: number) {
    this.box.displacement.x = dx; // pointer delta → origin, 1:1
    this.box.displacement.y = dy;
  }

  protected release(vx: number, vy: number) {
    if (!this.#detents) {
      this.box.displacement.apply(); // free move — fold the delta, no snap
      return;
    }
    this.settle("x", this.#detents.x, vx);
    this.settle("y", this.#detents.y, vy);
  }
}

export interface ResizeConfig {
  /** Size detents to settle onto, per axis. */
  detents: { w: number[]; h: number[] };
  /** Elastic bounds applied live during the drag, per axis. */
  clamp: { w: Modifier; h: Modifier };
  /** Gain per axis — 2 on the axis `place()` centers (both edges move, so the
   * grabbed corner tracks the pointer only at 2×), 1 otherwise. Default 1. */
  gain?: { w: number; h: number };
  /** Blur the content on start; clear it once both axes settle. */
  onStart?(): void;
  onSettle?(): void;
}

/**
 * Resize a box from a handle: the pointer delta maps onto w/h through the
 * {@link Handle} coefficients (× gain), rubber-clamped to the size bounds. The
 * live delta renders as `scale` (ElementBox's --sx/--sy); release snaps to a
 * size detent and springs the scale back to 1. Listens on `on` (the handle),
 * resizes `box` (the overlay) — two different elements.
 */
export class Resizable extends PointerGesture {
  readonly #handle: Handle;
  readonly #cfg: ResizeConfig;

  constructor(
    box: ElementBox,
    handle: Handle,
    on: HTMLElement,
    cfg: ResizeConfig,
  ) {
    super(box, on);
    this.#handle = handle;
    this.#cfg = cfg;
  }

  #gain() {
    return { w: this.#cfg.gain?.w ?? 1, h: this.#cfg.gain?.h ?? 1 };
  }

  protected onStart() {
    // Freeze an AUTO axis to its measured content size before growing from it —
    // only the axes this handle drives. The measuring getter reads the size,
    // the setter pins it as the base; the resize then commits a detent on
    // release. (A driven axis is already a number, so this is a no-op there.)
    const { w, h } = this.box;
    if (this.#handle.w) this.box.w = w;
    if (this.#handle.h) this.box.h = h;
    this.#cfg.onStart?.();
  }
  protected onSettle() {
    this.#cfg.onSettle?.();
  }

  protected drive(dx: number, dy: number) {
    const g = this.#gain();
    const base = this.box.transform;
    const w = this.#cfg.clamp.w(base.w + g.w * this.#handle.w * dx);
    const h = this.#cfg.clamp.h(base.h + g.h * this.#handle.h * dy);
    this.box.displacement.w = w - base.w; // → --sx scale
    this.box.displacement.h = h - base.h;
  }

  protected release(vx: number, vy: number) {
    const g = this.#gain();
    // The size changed at gain·coefficient× the pointer speed — settle on that.
    this.settle("w", this.#cfg.detents.w, g.w * this.#handle.w * vx);
    this.settle("h", this.#cfg.detents.h, g.h * this.#handle.h * vy);
  }
}
