import { effect, onCleanup, signal } from "@/signals/index.ts";
import { createElementRect } from "@/utilities/element-rect.ts";
import {
  Box,
  type BoxLike,
  isReactiveBox,
  type PlainBox,
  readBox,
} from "./box.ts";
import { clamp } from "./session.ts";

/**
 * The constraint — a region the overlay stays inside; one of the
 * spatial classes (with the anchor and the overlay itself). Built from
 * an element (observed), a `BoxLike` (reactive getters pass through; a
 * plain box becomes an OWNED, editable region — spotlights, split
 * panes), or nothing (the live viewport).
 *
 * `constrain()` is the pure clamp every composition builds on:
 * `overlay.set(c.constrain(box))`. Applying a constraint to an overlay
 * (syncing the `--overlay-constraint-*` channels every location clamp
 * and gesture bound derives from) is `applyConstraint` — internal,
 * reached through the `within` option.
 */
export class Constraint extends Box {
  #read: () => Required<PlainBox>;
  /** The owned region when built from a plain box — editable. */
  #owned: ReturnType<typeof signal<Required<PlainBox>>> | undefined;

  constructor(source?: Element | BoxLike) {
    super();
    if (source === undefined) {
      this.#read = () => ({
        x: 0,
        y: 0,
        w: window.innerWidth,
        h: window.innerHeight,
      });
    } else if (source instanceof Element) {
      const rect = createElementRect(source);
      onCleanup(() => rect[Symbol.dispose]());
      this.#read = () => ({
        x: rect.left(),
        y: rect.top(),
        w: rect.width(),
        h: rect.height(),
      });
    } else if (isReactiveBox(source)) {
      this.#read = () => readBox(source);
    } else {
      const owned = signal(readBox(source));
      this.#owned = owned;
      this.#read = () => ({ ...owned() });
    }
  }

  protected read(): Required<PlainBox> {
    return this.#read();
  }

  protected write(box: Partial<PlainBox>): void {
    const owned = this.#owned;
    if (!owned) {
      throw new Error(
        "Constraint is read-only — only a plain-box Constraint owns its region",
      );
    }
    owned({ ...owned(), ...box });
  }

  /** Pure clamp: the box forced inside the region — size capped to the
   * region, position clamped so the box can't leave it. */
  constrain(box: PlainBox): Required<PlainBox> {
    const r = this.read();
    const w = Math.min(box.w ?? 0, r.w);
    const h = Math.min(box.h ?? 0, r.h);
    return {
      x: clamp(box.x, r.x, Math.max(r.x + r.w - w, r.x)),
      y: clamp(box.y, r.y, Math.max(r.y + r.h - h, r.y)),
      w,
      h,
    };
  }
}

/**
 * Applies a constraint to an overlay by syncing its region into the
 * `--overlay-constraint-top/-left/-width/-height` channels (declared in
 * index.css with viewport defaults) — the overlay re-clamps reactively
 * whenever the region changes. Internal: reached through the `within`
 * option on `Overlay` (and the flip boundary in `Anchor.bind`).
 *
 * Caveat: an element-backed region observes size changes
 * (`ResizeObserver`) — a container that moves without resizing (e.g.
 * page scroll) does not retrigger the sync.
 */
export function applyConstraint(
  overlay: HTMLElement,
  within: Element | BoxLike | Constraint,
): { dispose(): void } {
  const region =
    within instanceof Constraint ? within : new Constraint(within);
  const stop = effect(() => {
    overlay.style.setProperty("--overlay-constraint-top", `${region.y()}px`);
    overlay.style.setProperty("--overlay-constraint-left", `${region.x()}px`);
    overlay.style.setProperty("--overlay-constraint-width", `${region.w()}px`);
    overlay.style.setProperty(
      "--overlay-constraint-height",
      `${region.h()}px`,
    );
  });

  const dispose = () => {
    stop();
    overlay.style.removeProperty("--overlay-constraint-top");
    overlay.style.removeProperty("--overlay-constraint-left");
    overlay.style.removeProperty("--overlay-constraint-width");
    overlay.style.removeProperty("--overlay-constraint-height");
  };
  onCleanup(dispose);

  return { dispose };
}

/**
 * Resolves a custom property holding a length to pixels. Plain `px` values
 * parse directly; anything else (`svh` / `calc()` / fractions of the
 * constraint) resolves natively by measuring a hidden probe. `fallback` is
 * a CSS length expression used when the property is unset.
 */
export function resolveVarPx(
  overlay: HTMLElement,
  name: string,
  axis: "height" | "width",
  fallback?: string,
): number {
  const raw = getComputedStyle(overlay).getPropertyValue(name).trim();
  if (/^-?\d+(\.\d+)?px$/.test(raw)) return parseFloat(raw);
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style[axis] = fallback ? `var(${name}, ${fallback})` : `var(${name})`;
  overlay.appendChild(probe);
  const px = probe.getBoundingClientRect()[axis];
  probe.remove();
  return px;
}

/** Resolves the constraint region every gesture bound derives from —
 * the one box vocabulary (`x`/`y` = the region's viewport top-left). */
export function resolveConstraint(overlay: HTMLElement): Required<PlainBox> {
  return {
    y: resolveVarPx(overlay, "--overlay-constraint-top", "height"),
    x: resolveVarPx(overlay, "--overlay-constraint-left", "width"),
    w: resolveVarPx(overlay, "--overlay-constraint-width", "width"),
    h: resolveVarPx(overlay, "--overlay-constraint-height", "height"),
  };
}
