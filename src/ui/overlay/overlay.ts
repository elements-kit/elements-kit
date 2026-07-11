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
  INSTANT_TRANSITIONS,
  resolveConstraint,
} from "./constraint.ts";
import { engageGesture, type GestureSession, type Point } from "./gesture.ts";
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
 * inside. The feel is per-edit (`begin(new SnapSession(stops))`); the
 * markup gestures (`.x-handle` children) are built in — pointer
 * plumbing that delegates off the handles and whose `GestureSession`s
 * drive this SAME edit lifecycle (free feel, flick-to-dismiss when
 * `dismissible`).
 *
 * `set()` speaks viewport coordinates and converts to channel space
 * internally (the channels hold the box CENTER relative to the
 * constraint origin); CSS renders and animates the writes — JS never
 * touches `translate`/`top`/`left`. With an anchor bound, the move
 * handle (`data-placement="move"`) drives the ANCHOR through its own
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
  /** The active markup gesture — its edits render differently (inline
   * sizes, dx/dy deltas, edge coupling) from plain edits. */
  #gesture: GestureSession | undefined;
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

    // The markup gestures: one pointer drive. With an anchor, the
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

  /** A markup resize is bounded by the gesture's rooms (from the
   * ANCHORED edge to the constraint), not the whole constraint span. */
  protected override editBounds(axis: Axis): [number, number] {
    return this.#gesture?.roomFor(axis) ?? super.editBounds(axis);
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

  /** Markup-gesture edit: apply the session's render intent — live
   * sizes INLINE (instant, no transition), coupled locations on the
   * channels, overshoot/dismiss-preview on the unclamped
   * `--overlay-dx/-dy` deltas. The math lives in `GestureSession`. */
  #syncGesture(box: Partial<PlainBox>): void {
    const el = this.#el;
    el.style.transition = "none";
    const r = this.#gesture!.render(box);
    if (r.width !== undefined) el.style.width = `${r.width}px`;
    if (r.height !== undefined) el.style.height = `${r.height}px`;
    if (r.x !== undefined) el.style.setProperty(CHANNEL.x, `${r.x}px`);
    if (r.y !== undefined) el.style.setProperty(CHANNEL.y, `${r.y}px`);
    for (const [name, v] of [
      ["--overlay-dx", r.dx],
      ["--overlay-dy", r.dy],
    ] as const) {
      if (v === undefined) continue;
      if (v === null) el.style.removeProperty(name);
      else el.style.setProperty(name, `${v}px`);
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
    const gesture = this.#gesture;
    if (gesture?.kind === "resize") {
      // The rested sizes pin the opposite edge exactly like the live drag.
      const loc = gesture.place(box);
      if (loc.x !== undefined) el.style.setProperty(CHANNEL.x, `${loc.x}px`);
      if (loc.y !== undefined) el.style.setProperty(CHANNEL.y, `${loc.y}px`);
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
    this.#el.style.setProperty("transition-property", INSTANT_TRANSITIONS);
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

  // --- the markup gestures --------------------------------------------------

  /** The `.x-handle` a pointerdown engages: a DIRECT child of this frame
   * (so a nested overlay's handle stays the nested overlay's), or `null`
   * when the press landed off every handle (card body, interactive
   * descendant, scrolled content — all keep their own behavior). */
  #handleFor(event: PointerEvent): HTMLElement | null {
    const handle = (event.target as Element | null)?.closest<HTMLElement>(
      ".x-handle",
    );
    return handle && handle.parentElement === this.#el ? handle : null;
  }

  /** The feel the built-in markup handles run their edits with —
   * override in a subclass to change it (e.g. return a `SnapSession`
   * so a sheet's pill snaps to detents; construct it fresh — a session
   * is one edit). Return `undefined` (the default) for the built-in
   * feel (free resize / edge slide). */
  protected gestureSession(kind: "move" | "resize"): Session | undefined {
    void kind;
    return undefined;
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

  /** The built-in handles — ONE pointer drive for both modes, delegating
   * off the frame's `.x-handle` children. With an anchor bound, the move
   * handle drags the ANCHOR through its edit API (the tear contract; the
   * overlay follows through the engine); otherwise `engageGesture` turns
   * the handle press into a `GestureSession` driving THIS box's edit.
   * Shared: capture, user-select suppression, and the touch-scroll
   * block. */
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
      const handle = this.#handleFor(event);
      if (!handle) return;
      if (anchor) {
        // Only the move handle tears the anchor off; resize handles have
        // no meaning for an anchored popover.
        if (handle.getAttribute("data-placement") !== "move") return;
        anchor.begin();
        drag = {
          kind: "anchor",
          down: { x: event.clientX, y: event.clientY },
          origin: { x: anchor.x(), y: anchor.y() },
        };
      } else {
        const session = engageGesture(el, handle, (kind) =>
          this.gestureSession(kind),
        );
        if (!session) return;
        this.#gesture = session;
        this.begin(session);
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
        this.#gesture!.move({
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
      const session = this.#gesture!;
      const delta = {
        x: event.clientX - ended.start.x,
        y: event.clientY - ended.start.y,
      };
      const dismiss =
        this.#dismissible &&
        session.shouldDismiss(this.read(), delta, ended.velocity);
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
