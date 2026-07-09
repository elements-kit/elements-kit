import { onCleanup } from "@/signals/index.ts";
import type { Anchor } from "./anchor.ts";
import {
  type Axis,
  Box,
  type BoxLike,
  type PlainBox,
  readValue,
} from "./box.ts";
import {
  applyConstraint,
  Constraint,
  resolveConstraint,
} from "./constraint.ts";
import {
  anchor as coupleEdge,
  detectEngagement,
  type GesturePlan,
  parseResize,
  planGesture,
  type Point,
  projectedOutOfBounds,
  shouldDismissResize,
  targetsAt,
} from "./preset.ts";
import type { Session } from "./session.ts";

export interface OverlayOptions {
  /** Initial geometry, written to the channels (one-shot). */
  box?: BoxLike;
  /** A tracked box to attach to — the overlay follows it for life.
   * Type-only coupling: `@floating-ui/dom` ships only where `Anchor`
   * is constructed. */
  anchor?: Anchor;
  /** Confine to a region: syncs the `--overlay-constraint-*` channels
   * every location clamp and gesture bound derives from. */
  within?: Element | BoxLike | Constraint;
  /** Surface trait: may the markup gestures flick-dismiss it. Default
   * `true`. */
  dismissible?: boolean;
}

/** While an edit drives the box, geometry writes must land instantly —
 * but ONLY geometry. Enter/exit (opacity, scale) and close (display)
 * keep transitioning. */
const EDIT_TRANSITIONS = "opacity, scale, display";

/** Interactive descendants a drag must not swallow the click of. */
const INTERACTIVE =
  "button, a, label, input, select, textarea, [contenteditable]";

const CHANNEL = {
  x: "--overlay-x",
  y: "--overlay-y",
  w: "--overlay-w",
  h: "--overlay-h",
} as const;

/**
 * The surface — a `Box` over the `.x-overlay` element's geometry
 * channels. The constructor takes only SPATIAL options (what the
 * overlay is): an initial box, an anchor to follow, a region to stay
 * inside. Physics are per-edit (`begin(new SnapSession(stops))`); the
 * markup gestures (`data-resize` / `data-draggable`) are the built-in
 * preset — pointer plumbing that drives this SAME edit lifecycle
 * (free physics, flick-to-dismiss when `dismissible`).
 *
 * `set()` speaks viewport coordinates and converts to channel space
 * internally (the channels hold the box CENTER relative to the
 * constraint origin); CSS renders and animates the writes — JS never
 * touches `translate`/`top`/`left`. With an anchor bound, the markup
 * move gesture (`data-draggable`) drives the ANCHOR through its own
 * edit API — the tear contract — instead of the channels.
 *
 * Registers its cleanup with the current scope (`onCleanup`) and also
 * exposes it as `dispose` / `Symbol.dispose`.
 *
 * @example
 * ```ts
 * import { Constraint, Overlay, SnapSession } from "elements-kit/ui/overlay";
 *
 * const c = new Constraint(container);
 * const o = new Overlay(el, { within: c });
 * o.set(c.constrain({ x: 80, y: 120 }));
 *
 * // custom handle with physics:
 * grip.onpointerdown = () => o.begin(new SnapSession([0.25, 0.6, 0.9]));
 * grip.onpointermove = (e) => o.set({ y: e.clientY });
 * grip.onpointerup   = () => o.release() ?? el.close();
 * ```
 */
export class Overlay extends Box {
  readonly #el: HTMLElement;
  readonly #dismissible: boolean;
  #editing = false;
  /** The active markup gesture's plan — preset edits render differently
   * (inline sizes, dx/dy deltas, edge coupling) from plain edits. */
  #gesture: GesturePlan | undefined;
  /** Channel strings at edit start — cancel restores them VERBATIM (a
   * `60svh` stays `60svh`). */
  #engaged: Record<keyof typeof CHANNEL, string> | undefined;
  #suppressEmit = false;
  readonly #disposers: Array<() => void> = [];

  constructor(el: HTMLElement, opts: OverlayOptions = {}) {
    super();
    this.#el = el;
    this.#dismissible = opts.dismissible ?? true;

    // Constraint FIRST — anchor.bind reads the channels to pick its
    // engine (an explicit constraint forces the boundary-aware one).
    if (opts.within) {
      const region =
        opts.within instanceof Constraint
          ? opts.within
          : new Constraint(opts.within);
      this.#disposers.push(applyConstraint(el, region).dispose);
    }

    if (opts.anchor)
      this.#disposers.push(opts.anchor.bind(el, opts.within !== undefined));

    if (opts.box) {
      const b = opts.box;
      this.write({
        x: readValue(b.x),
        y: readValue(b.y),
        ...(b.w !== undefined ? { w: readValue(b.w) } : {}),
        ...(b.h !== undefined ? { h: readValue(b.h) } : {}),
      });
    }

    // The markup gesture preset: one pointer drive. With an anchor, the
    // move gesture drives the ANCHOR's edit (the tear contract); without
    // one, it drives THIS box's edits through the zone plans.
    this.#wireGestures(opts.anchor);

    onCleanup(() => this.dispose());
  }

  // --- Box plumbing -----------------------------------------------------

  protected read(): Required<PlainBox> {
    const r = this.#el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  protected override region(): Required<PlainBox> {
    return resolveConstraint(this.#el);
  }

  /** A preset resize is bounded by its plan's rooms (from the ANCHORED
   * edge to the constraint), not the whole constraint span. */
  protected override editBounds(axis: Axis): [number, number] {
    const plan = this.#gesture;
    if (plan?.kind === "resize" && (axis === "w" || axis === "h")) {
      const a = plan.axes.find((a) => a.size === axis);
      if (a) return [a.lo, a.hi];
    }
    return super.editBounds(axis);
  }

  /** Viewport box → the element. In-edit writes render live (inline
   * sizes / transient deltas, transitions off); committed writes land
   * on the channels (animated, `resizechange` for sizes). */
  protected write(box: Partial<PlainBox>): void {
    if (this.#editing && this.#gesture) this.#syncGesture(box);
    else if (this.#editing) this.#syncEdit(box);
    else this.#commit(box);
  }

  /** Viewport x/y → channel space (the channels hold the box CENTER
   * relative to the constraint origin). */
  #locChannels(box: Partial<PlainBox>): void {
    const el = this.#el;
    const c = resolveConstraint(el);
    const current = this.read();
    const w = box.w ?? current.w;
    const h = box.h ?? current.h;
    if (box.x !== undefined)
      el.style.setProperty(CHANNEL.x, `${box.x + w / 2 - c.x}px`);
    if (box.y !== undefined)
      el.style.setProperty(CHANNEL.y, `${box.y + h / 2 - c.y}px`);
  }

  /** Plain (custom-handle) edit: live channel writes, converted. */
  #syncEdit(box: Partial<PlainBox>): void {
    const el = this.#el;
    this.#locChannels(box);
    if (box.w !== undefined) el.style.setProperty(CHANNEL.w, `${box.w}px`);
    if (box.h !== undefined) el.style.setProperty(CHANNEL.h, `${box.h}px`);
  }

  /** Markup-gesture edit: live sizes render INLINE (instant, no
   * transition); the opposite edge is pinned through the location
   * channels; overshoot past the room — and the below-minimum dismiss
   * preview — ride the unclamped `--overlay-dx/-dy` (the committed
   * channels are CSS-clamped, so rubber must live on the delta layer).
   * A move rides the deltas entirely. */
  #syncGesture(box: Partial<PlainBox>): void {
    const el = this.#el;
    const plan = this.#gesture!;
    el.style.transition = "none";
    if (plan.kind === "move") {
      if (box.x !== undefined)
        el.style.setProperty("--overlay-dx", `${box.x - plan.rect.x}px`);
      if (box.y !== undefined)
        el.style.setProperty("--overlay-dy", `${box.y - plan.rect.y}px`);
      return;
    }
    for (const a of plan.axes) {
      const v = box[a.size];
      if (v === undefined) continue;
      let size: number;
      let slide: number | null;
      if (v > a.hi) {
        // Past the room the box cannot grow — the size pins and the
        // resisted overshoot translates the whole surface instead.
        size = a.hi;
        slide = a.sign * (v - a.hi);
      } else if (v < a.lo && a.pinBelow) {
        size = a.lo;
        slide = -a.sign * (a.lo - Math.max(v, 0));
      } else {
        size = v;
        slide = null;
      }
      if (a.size === "w") el.style.width = `${size}px`;
      else el.style.height = `${size}px`;
      const loc = coupleEdge({
        axis: a.axisName,
        center0: plan.center0,
        constraint: plan.constraint,
        anchorSign: a.anchorSign,
        startSize: a.startSize,
        size,
        docked: a.docked,
      });
      if (loc !== null)
        el.style.setProperty(CHANNEL[a.loc], `${loc}px`);
      const offsetName = a.offset === "dx" ? "--overlay-dx" : "--overlay-dy";
      if (slide === null) el.style.removeProperty(offsetName);
      else el.style.setProperty(offsetName, `${slide}px`);
    }
  }

  /** Persist a box to the channels: drag scaffolding off, values on
   * (animated by CSS), `resizechange` for sizes. */
  #commit(box: Partial<PlainBox>): void {
    const el = this.#el;
    el.style.removeProperty("height");
    el.style.removeProperty("width");
    el.style.removeProperty("--overlay-dy");
    el.style.removeProperty("--overlay-dx");
    el.style.removeProperty("transition");
    el.style.removeProperty("user-select");
    el.style.removeProperty("-webkit-user-select");
    if (box.w !== undefined) el.style.setProperty(CHANNEL.w, `${box.w}px`);
    if (box.h !== undefined) el.style.setProperty(CHANNEL.h, `${box.h}px`);
    const plan = this.#gesture;
    if (plan?.kind === "resize") {
      // The rested sizes pin the opposite edge exactly like the live drag.
      for (const a of plan.axes) {
        const size = box[a.size];
        if (size === undefined) continue;
        const loc = coupleEdge({
          axis: a.axisName,
          center0: plan.center0,
          constraint: plan.constraint,
          anchorSign: a.anchorSign,
          startSize: a.startSize,
          size,
          docked: a.docked,
        });
        if (loc !== null)
          el.style.setProperty(CHANNEL[a.loc], `${loc}px`);
      }
    } else {
      this.#locChannels(box);
    }
    if ((box.w !== undefined || box.h !== undefined) && !this.#suppressEmit) {
      el.dispatchEvent(
        new CustomEvent("resizechange", {
          bubbles: true,
          composed: true,
          detail: {
            width: el.style.getPropertyValue(CHANNEL.w) || undefined,
            height: el.style.getPropertyValue(CHANNEL.h) || undefined,
          },
        }),
      );
    }
  }

  protected override editStart(): void {
    this.#editing = true;
    const get = (name: string) => this.#el.style.getPropertyValue(name);
    this.#engaged = {
      x: get(CHANNEL.x),
      y: get(CHANNEL.y),
      w: get(CHANNEL.w),
      h: get(CHANNEL.h),
    };
    this.#el.style.setProperty("transition-property", EDIT_TRANSITIONS);
  }

  protected override editEnd(): void {
    this.#editing = false;
    this.#el.style.removeProperty("transition-property");
  }

  /** Abort restores the channels VERBATIM as they were at `begin()` — a
   * prior persisted gesture, or the author's `60svh`, survives intact. */
  override cancel(): void {
    const engaged = this.#engaged;
    this.#suppressEmit = true;
    super.cancel();
    this.#suppressEmit = false;
    if (engaged) {
      for (const k of ["x", "y", "w", "h"] as const) {
        if (engaged[k]) this.#el.style.setProperty(CHANNEL[k], engaged[k]);
        else this.#el.style.removeProperty(CHANNEL[k]);
      }
      this.#engaged = undefined;
    }
  }

  // --- the markup gesture preset ------------------------------------------

  /** Common engagement guards: interactive descendants keep their
   * clicks; scrolled content keeps its scroll-back gesture. */
  #guarded(event: PointerEvent): boolean {
    const el = this.#el;
    const target = event.target as Element | null;
    if (target?.closest(INTERACTIVE)) return true;
    for (
      let node = target;
      node !== null && node !== el;
      node = node.parentElement
    ) {
      if (node.scrollTop > 0) return true;
    }
    return false;
  }

  /** The physics the built-in markup handles run their edits with —
   * override in a subclass to change the feel (e.g. return a
   * `SnapSession` so a sheet's pill snaps to detents). Default: the
   * plan's own (free resize / edge slide). */
  protected gestureSession(plan: GesturePlan): Session {
    return plan.session;
  }

  #close(): void {
    const el = this.#el;
    if (el instanceof HTMLDialogElement && el.open) el.close();
    else (el as { hidePopover?: () => void }).hidePopover?.();
  }

  /** Restore the engage channels and close — a dismissing gesture
   * reverts ITS changes (an author morph survives), then the overlay
   * leaves. */
  #dismiss(): void {
    this.cancel();
    this.#close();
  }

  /** The built-in handles: pointer plumbing driving THIS box's edit
   * lifecycle — zones from the markup attributes, physics from the
   * plan's `Session`, dismissal as preset policy. */
  /** The built-in handles — ONE pointer drive for both modes. With an
   * anchor bound, `data-draggable` drags the ANCHOR through its edit
   * API (the tear contract; the overlay follows through the engine);
   * otherwise the zones plan drives THIS box's edits. Shared: the
   * engagement guards, capture, user-select suppression, and the
   * touch-scroll block. */
  #wireGestures(anchor?: Anchor): void {
    const el = this.#el;
    type Drag =
      | {
          kind: "self";
          start: Point;
          prev: Point;
          lastTime: number;
          velocity: Point;
        }
      | { kind: "anchor"; down: Point; origin: { x: number; y: number } };
    let drag: Drag | null = null;

    const clearSelection = () => {
      el.style.removeProperty("user-select");
      el.style.removeProperty("-webkit-user-select");
    };

    const onDown = (event: PointerEvent) => {
      if (drag || event.button !== 0) return;
      if (anchor) {
        if (!el.hasAttribute("data-draggable")) return;
        if (this.#guarded(event)) return;
        anchor.begin();
        drag = {
          kind: "anchor",
          down: { x: event.clientX, y: event.clientY },
          origin: { x: anchor.x(), y: anchor.y() },
        };
      } else {
        const resize = el.getAttribute("data-resize") ?? "";
        const draggable = el.hasAttribute("data-draggable");
        if (!resize && !draggable) return;
        if (this.#guarded(event)) return;
        const parsed = parseResize(resize);
        const constraint = resolveConstraint(el);
        const rect = this.read();
        const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
        const kind = detectEngagement({
          ...parsed,
          draggable,
          rect,
          pointer: { x: event.clientX, y: event.clientY },
          dir,
        });
        if (!kind) return;
        this.#gesture = planGesture(kind, parsed, rect, constraint, dir);
        this.begin(this.gestureSession(this.#gesture));
        const c = { x: event.clientX, y: event.clientY };
        drag = {
          kind: "self",
          start: { ...c },
          prev: { ...c },
          lastTime: event.timeStamp,
          velocity: { x: 0, y: 0 },
        };
      }
      el.style.userSelect = "none";
      el.style.setProperty("-webkit-user-select", "none");
      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        // No active pointer with that id (synthetic events) — the drag
        // still tracks through the listeners.
      }
    };

    const onMove = (event: PointerEvent) => {
      if (!drag) return;
      if (drag.kind === "anchor") {
        anchor!.set({
          x: drag.origin.x + (event.clientX - drag.down.x),
          y: drag.origin.y + (event.clientY - drag.down.y),
        });
        return;
      }
      const c = { x: event.clientX, y: event.clientY };
      const dt = event.timeStamp - drag.lastTime;
      if (dt > 0) {
        drag.velocity = {
          x: (c.x - drag.prev.x) / dt,
          y: (c.y - drag.prev.y) / dt,
        };
      }
      drag.prev = c;
      drag.lastTime = event.timeStamp;
      this.set(
        targetsAt(this.#gesture!, {
          x: c.x - drag.start.x,
          y: c.y - drag.start.y,
        }),
      );
    };

    const onUp = (event: PointerEvent) => {
      if (!drag) return;
      const ended = drag;
      drag = null;
      try {
        el.releasePointerCapture(event.pointerId);
      } catch {
        // Was never captured — nothing to release.
      }
      if (ended.kind === "anchor") {
        clearSelection();
        anchor!.release();
        return;
      }
      const plan = this.#gesture!;
      const delta = {
        x: event.clientX - ended.start.x,
        y: event.clientY - ended.start.y,
      };
      const dismiss =
        this.#dismissible &&
        (plan.kind === "move"
          ? projectedOutOfBounds(this.read(), ended.velocity, plan.constraint)
          : shouldDismissResize(plan, delta, ended.velocity, 0.5));
      if (dismiss) {
        this.#dismiss();
      } else if (this.release() === null && this.#dismissible) {
        // The session itself rested null (e.g. a SnapSession flick past
        // its smallest stop) — the edit already restored the snapshot;
        // honor the dismiss signal.
        this.#close();
      }
      this.#gesture = undefined;
    };

    const onCancel = () => {
      if (!drag) return;
      const ended = drag;
      drag = null;
      if (ended.kind === "anchor") {
        clearSelection();
        anchor!.cancel();
        return;
      }
      this.cancel();
      this.#gesture = undefined;
    };

    const blockScroll = (event: TouchEvent) => {
      if (drag) event.preventDefault();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("touchmove", blockScroll, { passive: false });
    this.#disposers.push(() => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("touchmove", blockScroll);
    });
  }

  dispose(): void {
    for (const dispose of this.#disposers.splice(0)) dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}
