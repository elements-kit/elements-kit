import { effect, onCleanup, signal, type Signal } from "@/signals/index.ts";
import { Anchor, position_area } from "./anchor.ts";
import { Constraint, resolveVarPx } from "./constraint.ts";
import {
  AUTO,
  type BoxLike,
  ElementBox,
  type PlainBox,
  readValue,
} from "./element-box.ts";
import {
  Draggable,
  type Handle,
  HANDLES,
  Resizable,
  rubber,
} from "./gestures.ts";

export interface OverlayOptions {
  /** Initial geometry (one-shot, clamped to the constraint). */
  box?: BoxLike;
  /** A tracked box to follow — anchored placement (`position_area`). */
  anchor?: Anchor;
  /** Confine to a region — the clamp/dock authority and flip boundary. */
  within?: Element | BoxLike | Constraint;
  /** May a flick dismiss the overlay. Default `true`. */
  dismissible?: boolean;
}

/** A resize handle's `data-placement` → the compass {@link Handle}. */
const HANDLE_FOR: Record<string, Handle> = {
  "block-start": HANDLES.n,
  "block-end": HANDLES.s,
  "inline-start": HANDLES.w,
  "inline-end": HANDLES.e,
  "start-start": HANDLES.nw,
  "start-end": HANDLES.ne,
  "end-start": HANDLES.sw,
  "end-end": HANDLES.se,
};

/** Default width when the overlay authors no size — the old `--overlay-width`. */
const DEFAULT_WIDTH = 480;

/** Resize floor — a small minimum so a panel can't collapse to nothing; kept
 * below typical panel sizes so a grab never rubber-jumps the size. */
const MIN_W = 48;
const MIN_H = 48;

/** How far a flick projects (ms of velocity carry) for the dismiss test. */
const PROJECTION_MS = 100;

/**
 * The surface — an `ElementBox` over the `.x-overlay` element. Position is
 * `translate` (base `--x/--y` + drag `--dx/--dy` + slide `--_ex/--_ey`), size
 * the real `--w/--h`; CSS transitions morph committed writes. The constructor
 * takes only SPATIAL options: an initial box, an anchor to follow, a region to
 * stay inside. Markup gestures (`.x-handle` children) wire `Draggable`/
 * `Resizable`; a `move` handle moves the window (or tears off an anchored one).
 *
 * @example
 * ```ts
 * const c = new Constraint(container);
 * const o = new Overlay(el, { within: c });
 * o.set({ x: 80, y: 120 });   // clamped, morphs via CSS
 * o.dock("bottom");           // flush to the constraint's bottom edge
 * ```
 */
export class Overlay extends ElementBox {
  readonly #dismissible: boolean;
  readonly #constraint: Constraint;
  /** Tear-off follow-gate — false while a torn anchored overlay is free. */
  readonly #pinned: Signal<boolean> = signal(true);
  readonly #disposers: Array<() => void> = [];
  /** Per-handle gesture teardown — cleared and rebuilt when handles change. */
  readonly #gestureDisposers: Array<() => void> = [];

  constructor(el: HTMLElement, opts: OverlayOptions = {}) {
    super(el);
    // ElementBox.dispose is a FIELD (not a method) — wrap it to also tear down
    // the overlay's own disposers (`[Symbol.dispose]` calls `this.dispose`).
    const inherited = this.dispose;
    this.dispose = () => {
      for (const dispose of this.#disposers.splice(0)) dispose();
      inherited();
    };
    this.#dismissible = opts.dismissible ?? true;
    this.#constraint =
      opts.within instanceof Constraint
        ? opts.within
        : new Constraint(opts.within);

    // Default to content sizing so the getters measure live (the box is often
    // constructed while closed, where the captured rect is 0).
    this.w = AUTO;
    this.h = AUTO;

    // Honor an authored size channel (`--overlay-w: 260px`) — the size intent
    // that the ElementBox model otherwise ignores.
    const styles = getComputedStyle(el);
    if (styles.getPropertyValue("--overlay-w").trim()) {
      this.set({ w: resolveVarPx(el, "--overlay-w", "width") });
    }
    if (styles.getPropertyValue("--overlay-h").trim()) {
      this.set({ h: resolveVarPx(el, "--overlay-h", "height") });
    }

    if (opts.box) {
      const b = opts.box;
      this.set({
        x: readValue(b.x),
        y: readValue(b.y),
        ...(b.w !== undefined ? { w: readValue(b.w) } : {}),
        ...(b.h !== undefined ? { h: readValue(b.h) } : {}),
      });
    }

    // Default width when nothing authored one (no `--overlay-w`, no `box.w`) —
    // else a content-auto width stretches the overlay across the viewport.
    // Height stays content-auto (fit to the card). Anchored menus can still
    // author `--overlay-w` (e.g. `anchor-size`) to override.
    if (Number.isNaN(this.transform.w)) this.set({ w: DEFAULT_WIDTH });

    if (opts.anchor) {
      const area =
        getComputedStyle(el).getPropertyValue("--overlay-area").trim() ||
        "block-end";
      const gap = resolveVarPx(el, "--overlay-gap", "width", "var(--space-2, 8px)");
      this.#disposers.push(
        position_area(this, opts.anchor, area, gap, this.#constraint, this.#pinned),
      );
      this.#disposers.push(() => opts.anchor?.dispose());
    }

    this.#wireHandles(!!opts.anchor);
    // Re-wire when `.x-handle` children are swapped at runtime (morph stories).
    const handleObs = new MutationObserver((muts) => {
      const touched = muts.some((m) =>
        [...m.addedNodes, ...m.removedNodes].some(
          (n) => n instanceof HTMLElement && n.classList.contains("x-handle"),
        ),
      );
      if (touched) this.#wireHandles(!!opts.anchor);
    });
    handleObs.observe(el, { childList: true });
    this.#disposers.push(() => handleObs.disconnect());
    this.#disposers.push(() => this.#placeStop?.());
    this.#disposers.push(() => {
      for (const dispose of this.#gestureDisposers.splice(0)) dispose();
    });
    if (opts.anchor) {
      // Re-pin a torn-off anchored overlay when it CLOSES — clear the drag and
      // resume following the anchor, so it's already home before the next open.
      this.#onToggle(undefined, () => {
        this.displacement.clear();
        this.#pinned(true);
      });
    } else if (!opts.box || opts.box.x === undefined) {
      // A free overlay with no authored position centers when shown (measured
      // then — the box model positions by top-left, so centering needs the size).
      this.#onToggle(() => this.center());
    }
    onCleanup(() => this.dispose());
  }

  /** The box's size for placement — the explicit base when set, else the
   * element's FRESH rendered size (not the ResizeObserver signal, which lags a
   * frame behind a just-opened or just-resized box). */
  #size(): { w: number; h: number } {
    const rect = this.element.getBoundingClientRect();
    return {
      w: Number.isNaN(this.transform.w) ? rect.width : this.transform.w,
      h: Number.isNaN(this.transform.h) ? rect.height : this.transform.h,
    };
  }

  /** Center the box in its constraint (so a modal lands dead-center). */
  center(): void {
    const r = this.#constraint;
    const { w, h } = this.#size();
    this.set({ x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2 });
  }

  /** Run `onOpen`/`onClose` on the overlay's open↔closed transitions (via the
   * popover `toggle` event and the `[open]` attribute). `onOpen` also fires now
   * if already open. */
  #onToggle(onOpen?: () => void, onClose?: () => void): void {
    const el = this.element;
    const isOpen = () =>
      (el instanceof HTMLDialogElement && el.open) ||
      el.matches?.(":popover-open");
    let was = isOpen();
    if (was) onOpen?.();
    const fire = (open: boolean) => {
      if (open === was) return;
      was = open;
      (open ? onOpen : onClose)?.();
    };
    const onToggle = (e: Event) => fire((e as ToggleEvent).newState === "open");
    const obs = new MutationObserver(() =>
      fire(el instanceof HTMLDialogElement ? el.open : isOpen()),
    );
    el.addEventListener("toggle", onToggle);
    obs.observe(el, { attributes: true, attributeFilter: ["open"] });
    this.#disposers.push(() => {
      el.removeEventListener("toggle", onToggle);
      obs.disconnect();
    });
  }

  /** Committed write, clamped to the constraint — morphs via CSS. */
  set(box: Partial<PlainBox>): void {
    const c = this.#constraint.constrain({
      x: box.x ?? this.x,
      y: box.y ?? this.y,
      w: box.w ?? this.w,
      h: box.h ?? this.h,
    });
    if (box.x !== undefined) this.x = c.x;
    if (box.y !== undefined) this.y = c.y;
    if (box.w !== undefined) this.w = c.w;
    if (box.h !== undefined) this.h = c.h;
  }

  /** Dock flush against one or more constraint edges (the JS docking that
   * replaces the retired `--overlay-y: 9999px` CSS clamp). One-shot — for a
   * box that MORPHS size, use {@link place} so the flush edge tracks the
   * animating size. */
  dock(...sides: ("top" | "bottom" | "left" | "right")[]): void {
    const { w, h } = this.#size();
    const d = this.#constraint.dock({ x: this.x, y: this.y, w, h }, ...sides);
    this.x = d.x;
    this.y = d.y;
  }

  /** REACTIVELY center the box, then flush the given edges — reads the box's
   * (reactive) size and constraint, so a docked/centered box stays anchored as
   * it morphs. Replaces the one-shot `center` + `dock` for the morph recipes,
   * where a single mid-transition measurement lands the box off its edge. */
  place(...sides: ("top" | "bottom" | "left" | "right")[]): void {
    this.#placeStop?.();
    this.#placeStop = effect(() => {
      const r = this.#constraint;
      // BASE size (no live drag delta) — re-docks on a settled size change, not
      // during a resize gesture (which would fight its edge-coupling).
      const w = this.measuredW;
      const h = this.measuredH;
      let x = r.x + (r.w - w) / 2;
      let y = r.y + (r.h - h) / 2;
      if (sides.includes("left")) x = r.x;
      if (sides.includes("right")) x = r.x + r.w - w;
      if (sides.includes("top")) y = r.y;
      if (sides.includes("bottom")) y = r.y + r.h - h;
      this.x = x;
      this.y = y;
    });
  }
  #placeStop?: () => void;

  #handles(): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const child of this.element.children) {
      if (child instanceof HTMLElement && child.classList.contains("x-handle")) {
        out.push(child);
      }
    }
    return out;
  }

  #close(): void {
    const el = this.element;
    if (el instanceof HTMLDialogElement && el.open) el.close();
    else (el as { hidePopover?: () => void }).hidePopover?.();
  }

  /** Wire each `.x-handle` child to its gesture. A `move` handle drags the
   * window (unpinning a torn anchored overlay); a placement handle resizes,
   * clamped to `[min, constraint]` with edge-coupling and — when
   * `dismissible` — a flick past the minimum dismisses. Re-runnable: disposes
   * the previous wiring first, so handles swapped in at runtime (the morph
   * stories) get gestured. */
  #wireHandles(anchored: boolean): void {
    for (const dispose of this.#gestureDisposers.splice(0)) dispose();
    const overlay = this;
    for (const handle of this.#handles()) {
      const placement = handle.getAttribute("data-placement") ?? "";
      if (placement === "move") {
        if (anchored) {
          handle.addEventListener("pointerdown", () => this.#pinned(false));
        }
        const move = new (class extends Draggable {
          protected override release(vx: number, vy: number): void {
            if (overlay.#dismissesMove(vx, vy)) {
              this.box.displacement.clear();
              overlay.#close();
              return;
            }
            super.release(vx, vy); // fold the drag into the base…
            overlay.set({ x: overlay.x, y: overlay.y }); // …then clamp inside
          }
        })(this, undefined, handle);
        this.#gestureDisposers.push(() => move.dispose());
      } else {
        const compass = HANDLE_FOR[placement];
        if (!compass) continue;
        const cw = this.#constraint.w;
        const ch = this.#constraint.h;
        // Per-handle minimum size (`data-min="280"`) — the resize floor and the
        // flick-dismiss threshold; defaults to a small floor.
        const authored = handle.dataset.min ? Number(handle.dataset.min) : NaN;
        const minW = Number.isNaN(authored) ? MIN_W : authored;
        const minH = Number.isNaN(authored) ? MIN_H : authored;
        const resize = new (class extends Resizable {
          protected override release(vx: number, vy: number): void {
            // Dismiss only on a shrink-FLICK — a fast release whose velocity
            // projects the driven size past half its min. A slow drag settles
            // at the min (rubber), it does NOT close.
            const FLICK = 0.5; // px/ms — below this, never dismiss
            const w =
              compass.w && Math.abs(vx) > FLICK
                ? overlay.w + compass.w * vx * PROJECTION_MS
                : Infinity;
            const h =
              compass.h && Math.abs(vy) > FLICK
                ? overlay.h + compass.h * vy * PROJECTION_MS
                : Infinity;
            if (overlay.#dismissible && (w < minW / 2 || h < minH / 2)) {
              overlay.#close();
              return;
            }
            super.release(vx, vy);
          }
        })(this, compass, handle, {
          detents: this.#detentsFor(handle, compass),
          clamp: {
            w: compass.w ? rubber(minW, cw, cw) : (v) => v,
            h: compass.h ? rubber(minH, ch, ch) : (v) => v,
          },
        });
        this.#gestureDisposers.push(() => resize.dispose());
      }
    }
  }

  /** Snap detents for a resize handle from its `data-detents` — space-separated
   * fractions of the constraint axis (`"0.25 0.6 0.9"` → 25/60/90%). Absent →
   * empty (free resize). Applied to the axis/axes the handle drives. */
  #detentsFor(
    handle: HTMLElement,
    compass: Handle,
  ): { w: number[]; h: number[] } {
    const raw = handle.dataset.detents;
    if (!raw) return { w: [], h: [] };
    const fracs = raw
      .split(/\s+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    const r = this.#constraint;
    return {
      w: compass.w ? fracs.map((f) => f * r.w) : [],
      h: compass.h ? fracs.map((f) => f * r.h) : [],
    };
  }

  /** A flicked move whose projected center leaves the constraint dismisses. */
  #dismissesMove(vx: number, vy: number): boolean {
    if (!this.#dismissible) return false;
    const cx = this.x + this.w / 2 + vx * PROJECTION_MS;
    const cy = this.y + this.h / 2 + vy * PROJECTION_MS;
    const r = this.#constraint;
    return cx < r.x || cx > r.x + r.w || cy < r.y || cy > r.y + r.h;
  }
}
