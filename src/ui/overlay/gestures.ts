/**
 * Gestures over `Motion` — two layers:
 *
 * - Pure shapers (`rubber`, `detent`, `snap`, `HANDLES`): stateless number
 *   math, no DOM — run in the box projection or the settle.
 * - Gesture binders (`Draggable`, `Resizable`): wire pointer events on an
 *   element to a reactive `ElementBox`, driving its `displacement` live and
 *   committing a settled base on release — the CSS transition glides it (no
 *   JS spring). The one DOM-touching, stateful piece.
 *
 * `apply` isn't a shaper — it's the box's geometry fold. Gestures decide the
 * delta; the box commits it. Velocities are `Motion`'s px/ms throughout.
 */

import { effect } from "@/signals";
import { scope } from "@/signals/scope";
import { ElementBox } from "./element-box";
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
function resist(overshoot: number, dimension: number, constant: number): number {
  return (
    (overshoot * dimension * constant) / (dimension + constant * overshoot)
  );
}

/** Elastic resistance past `[min, max]`. The true value stays in `Motion`, so
 * release settles back cleanly. `dimension` = axis extent; `constant` = iOS
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

/** The eight resize handles by compass point. A moving edge (`x`/`y`) shifts
 * the origin so the opposite edge stays pinned while `w`/`h` grow the REAL
 * size — no `scale`, so content never distorts. */
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

// ── gesture binders ───────────────────────────────────────────────────────

/**
 * The shared pointer→box machine: capture the pointer, accumulate its motion,
 * drive the box's live `displacement` through {@link drive} every frame, and on
 * release hand each moved channel to {@link settle} (commit a snapped base;
 * the CSS transition glides it). Live tracking suppresses the element's CSS
 * transition (instant); release restores it before committing, so the settle
 * animates. Re-grabbing folds any leftover delta into the base first (no jump).
 *
 * `on` defaults to the box's own element but may differ — the resize handle
 * captures the pointer while the OVERLAY box is what actually resizes.
 */
abstract class PointerGesture {
  protected motion?: { x: Motion; y: Motion };
  readonly #on: HTMLElement;
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

  /** The captured pointer id, or `undefined` when capture failed (synthetic
   * events have no active pointer) — then `#move` doesn't gate on it. */
  #captured: number | undefined;

  #down = (e: PointerEvent) => {
    try {
      this.#on.setPointerCapture(e.pointerId);
      this.#captured = e.pointerId;
    } catch {
      this.#captured = undefined;
    }
    // Instant live tracking — also cancels any in-flight settle glide (the
    // base is already at its committed target, so this just freezes there).
    this.box.element.style.setProperty("transition", "none");
    this.box.displacement.apply(); // fold any leftover into base — no jump
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
    if (!this.motion) return;
    // Only gate on capture when it succeeded (a real pointer); synthetic
    // drags never capture, so the drag still tracks through these listeners.
    if (this.#captured !== undefined && !this.#on.hasPointerCapture(e.pointerId)) {
      return;
    }
    this.motion.x.value = e.clientX; // feed the per-frame delta; Motion sums it
    this.motion.y.value = e.clientY;
  };

  #up = (e: PointerEvent) => {
    if (!this.motion) return;
    try {
      this.#on.releasePointerCapture(e.pointerId);
    } catch {}
    this.#live?.(); // stop the live projection before settling
    // Re-enable the CSS transition, then commit — the base change (dragged →
    // snapped) glides in a single transition (all position is `translate`).
    this.box.element.style.removeProperty("transition");
    this.release(this.motion.x.velocity, this.motion.y.velocity);
    this.onSettle?.();
    this.motion = undefined;
  };

  #cancel = () => {
    this.#live?.();
    this.box.element.style.removeProperty("transition");
    this.box.displacement.clear(); // glide back to the base
    this.onSettle?.();
    this.motion = undefined;
  };

  /**
   * Settle one channel: commit the velocity-projected detent to the base and
   * zero the delta in the SAME task, so the net `translate`/size change is
   * dragged → target — one CSS transition glides it.
   */
  protected settle(k: "x" | "y" | "w" | "h", detents: number[], velocity: number) {
    this.box[k] = snap(this.box[k], velocity, detents); // base ← target
    this.box.displacement[k] = 0; // delta ← 0 → visual = target
  }

  /** Map the pointer's accumulated (dx, dy) onto the box's live displacement. */
  protected abstract drive(dx: number, dy: number): void;
  /** Commit each driven channel from its release velocity. */
  protected abstract release(vx: number, vy: number): void;
  /** Optional side effects — e.g. blur on start, clear once rested. */
  protected onStart?(): void;
  protected onSettle?(): void;

  dispose() {
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
  /** Gain per axis — 2 on the axis a centered placement centers (both edges
   * move, so the grabbed corner tracks the pointer only at 2×), 1 otherwise. */
  gain?: { w: number; h: number };
  /** Side effects — e.g. blur on start, clear once rested. */
  onStart?(): void;
  onSettle?(): void;
}

/**
 * Resize a box from a handle: the pointer delta maps onto w/h through the
 * {@link Handle} coefficients (× gain), rubber-clamped to the size bounds, and
 * a moving edge shifts the origin (x/y) so the OPPOSITE edge stays pinned —
 * edge-coupling. The live delta renders as REAL width/height (no scale);
 * release snaps to a size detent and the CSS transition glides it. Listens on
 * `on` (the handle), resizes `box` (the overlay) — two different elements.
 */
export class Resizable extends PointerGesture {
  readonly #handle: Handle;
  readonly #cfg: ResizeConfig;

  constructor(box: ElementBox, handle: Handle, on: HTMLElement, cfg: ResizeConfig) {
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

  /** The UNCLAMPED size intent from the last drive — a subclass reads it to
   * detect a drag past the min (shrink-to-dismiss), which the rubber clamp
   * would otherwise hide. `NaN` on the axes the handle doesn't drive. */
  protected rawW = NaN;
  protected rawH = NaN;

  protected drive(dx: number, dy: number) {
    const g = this.#gain();
    const base = this.box.transform;
    const rawW = base.w + g.w * this.#handle.w * dx;
    const rawH = base.h + g.h * this.#handle.h * dy;
    this.rawW = this.#handle.w ? rawW : NaN;
    this.rawH = this.#handle.h ? rawH : NaN;
    const dw = this.#cfg.clamp.w(rawW) - base.w;
    const dh = this.#cfg.clamp.h(rawH) - base.h;
    this.box.displacement.w = dw; // → real width
    this.box.displacement.h = dh;
    // Edge-coupling: a moving edge shifts the origin so the opposite edge
    // stays pinned (a west/north handle grows leftward/upward).
    this.box.displacement.x = -this.#handle.x * dw;
    this.box.displacement.y = -this.#handle.y * dh;
  }

  protected release(vx: number, vy: number) {
    const g = this.#gain();
    if (this.#handle.w) {
      this.#settleAxis("w", "x", this.#handle.x, this.#cfg.detents.w, g.w * this.#handle.w * vx);
    }
    if (this.#handle.h) {
      this.#settleAxis("h", "y", this.#handle.y, this.#cfg.detents.h, g.h * this.#handle.h * vy);
    }
  }

  /** Commit a size axis to a detent and re-derive its coupled origin so the
   * opposite edge stays pinned at the settled size — both glide together. */
  #settleAxis(
    size: "w" | "h",
    origin: "x" | "y",
    hMove: number,
    detents: number[],
    velocity: number,
  ) {
    const start = this.box.transform[size];
    // No detents → rest at the dragged size (free resize).
    const target = detents.length
      ? snap(this.box[size], velocity, detents)
      : this.box[size];
    this.box[size] = target;
    this.box.displacement[size] = 0;
    this.box[origin] = this.box.transform[origin] - hMove * (target - start);
    this.box.displacement[origin] = 0;
  }
}
