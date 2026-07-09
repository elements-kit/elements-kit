import { onCleanup } from "@/signals/index.ts";
import type { Anchor } from "./anchor.ts";
import {
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
  detectEngagement,
  type FrameIO,
  freeResize,
  type GestureSession,
  parseResize,
} from "./gesture-model.ts";
import { createFrameIO, createGestureRecognizer } from "./overlay-dom.ts";
import { selectSession } from "./preset.ts";

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

/**
 * The surface — a `Box` over the `.x-overlay` element's geometry
 * channels. The constructor takes only SPATIAL options (what the
 * overlay is): an initial box, an anchor to follow, a region to stay
 * inside. Physics are per-edit (`begin(new SnapSession(stops))`); the
 * markup gestures (`data-resize` / `data-draggable`) are the built-in
 * preset — free resize, flick-to-dismiss when `dismissible`.
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
  readonly #io: FrameIO;
  #editing = false;
  readonly #disposers: Array<() => void> = [];

  constructor(el: HTMLElement, opts: OverlayOptions = {}) {
    super();
    this.#el = el;

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

    this.#io = createFrameIO(el, {
      strategy: freeResize(),
      dismissible: opts.dismissible ?? true,
      velocityThreshold: 0.5,
    });

    if (opts.box) {
      const b = opts.box;
      this.write({
        x: readValue(b.x),
        y: readValue(b.y),
        ...(b.w !== undefined ? { w: readValue(b.w) } : {}),
        ...(b.h !== undefined ? { h: readValue(b.h) } : {}),
      });
    }

    // The markup gesture preset. With an anchor, the move gesture drives
    // the anchor's edit (drag the ANCHOR, not the overlay); without one,
    // the recognizer runs the channel sessions as always.
    if (opts.anchor) this.#wireAnchorDrag(opts.anchor);
    else this.#wireGestures();

    onCleanup(() => this.dispose());
  }

  // --- Box plumbing -----------------------------------------------------

  protected read(): Required<PlainBox> {
    const r = this.#el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  protected override region(): Required<PlainBox> {
    const c = resolveConstraint(this.#el);
    return { x: c.left, y: c.top, w: c.width, h: c.height };
  }

  /** Viewport box → channel writes. Committed writes go through the
   * gesture IO (persisting + `resizechange`); in-edit writes land on
   * the channels directly, transitions suppressed by `editStart`. */
  protected write(box: Partial<PlainBox>): void {
    const el = this.#el;
    const c = resolveConstraint(el);
    const current = this.read();
    const w = box.w ?? current.w;
    const h = box.h ?? current.h;
    const out: { x?: number; y?: number; w?: number; h?: number } = {};
    if (box.w !== undefined) out.w = box.w;
    if (box.h !== undefined) out.h = box.h;
    if (box.x !== undefined) out.x = box.x + w / 2 - c.left;
    if (box.y !== undefined) out.y = box.y + h / 2 - c.top;
    if (this.#editing) {
      if (out.x !== undefined)
        el.style.setProperty("--overlay-x", `${out.x}px`);
      if (out.y !== undefined)
        el.style.setProperty("--overlay-y", `${out.y}px`);
      if (out.w !== undefined)
        el.style.setProperty("--overlay-w", `${out.w}px`);
      if (out.h !== undefined)
        el.style.setProperty("--overlay-h", `${out.h}px`);
    } else {
      this.#io.commit(out);
    }
  }

  protected override editStart(): void {
    this.#editing = true;
    this.#el.style.setProperty("transition-property", EDIT_TRANSITIONS);
  }

  protected override editEnd(): void {
    this.#editing = false;
    this.#el.style.removeProperty("transition-property");
  }

  // --- the markup gesture preset ------------------------------------------

  #wireGestures(): void {
    const el = this.#el;
    const canEngage = (event: PointerEvent): boolean => {
      const resize = el.getAttribute("data-resize") ?? "";
      const draggable = el.hasAttribute("data-draggable");
      if (!resize && !draggable) return false;
      // Leave interactive elements alone — capturing the pointer would
      // retarget the pointerup to the overlay and swallow their click.
      const target = event.target as Element | null;
      if (target?.closest(INTERACTIVE)) return false;
      // Don't hijack a scroll-back gesture inside scrolled content.
      for (
        let node = target;
        node !== null && node !== el;
        node = node.parentElement
      ) {
        if (node.scrollTop > 0) return false;
      }
      return true;
    };

    const engage = (event: PointerEvent): GestureSession | null => {
      const parsed = parseResize(el.getAttribute("data-resize") ?? "");
      const draggable = el.hasAttribute("data-draggable");
      const { snapshot, resizer, move } = this.#io.engage();
      const key = detectEngagement({
        ...parsed,
        draggable,
        rect: snapshot.rect,
        pointer: { x: event.clientX, y: event.clientY },
        dir: snapshot.dir,
      });
      if (!key) return null;
      return selectSession(key, parsed, snapshot, resizer, move, this.#io);
    };

    const recognizer = createGestureRecognizer(el, { canEngage, engage });
    this.#disposers.push(recognizer.dispose);
  }

  /** Anchored overlays: `data-draggable` drags the ANCHOR through its
   * edit API — first write tears the follow pin (the tear contract);
   * the overlay follows through the engine. */
  #wireAnchorDrag(anchor: Anchor): void {
    const el = this.#el;
    let engaged: { down: { x: number; y: number }; origin: PlainBox } | null =
      null;

    const onDown = (event: PointerEvent) => {
      if (engaged || event.button !== 0) return;
      if (!el.hasAttribute("data-draggable")) return;
      const at = event.target as Element | null;
      if (at?.closest(INTERACTIVE)) return;
      anchor.begin();
      engaged = {
        down: { x: event.clientX, y: event.clientY },
        origin: { x: anchor.x(), y: anchor.y() },
      };
      el.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!engaged) return;
      anchor.set({
        x: engaged.origin.x + (event.clientX - engaged.down.x),
        y: engaged.origin.y + (event.clientY - engaged.down.y),
      });
    };
    const onUp = () => {
      if (!engaged) return;
      engaged = null;
      anchor.release();
    };
    const onCancel = () => {
      if (!engaged) return;
      engaged = null;
      anchor.cancel();
    };

    el.addEventListener("pointerdown", onDown as EventListener);
    el.addEventListener("pointermove", onMove as EventListener);
    el.addEventListener("pointerup", onUp as EventListener);
    el.addEventListener("pointercancel", onCancel as EventListener);
    this.#disposers.push(() => {
      el.removeEventListener("pointerdown", onDown as EventListener);
      el.removeEventListener("pointermove", onMove as EventListener);
      el.removeEventListener("pointerup", onUp as EventListener);
      el.removeEventListener("pointercancel", onCancel as EventListener);
    });
  }

  dispose(): void {
    for (const dispose of this.#disposers.splice(0)) dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}
