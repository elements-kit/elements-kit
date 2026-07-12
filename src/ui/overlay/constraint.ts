import { onCleanup, signal, type Signal } from "@/signals/index.ts";
import { createElementRect } from "@/utilities/element-rect.ts";
import {
  type BoxLike,
  type IBox,
  isReactiveBox,
  type PlainBox,
  readBox,
  WINDOW_BOX,
} from "./element-box.ts";

function clamp(value: number, lo: number, hi: number): number {
  return hi < lo ? lo : Math.min(Math.max(value, lo), hi);
}

/**
 * The constraint — a region the overlay stays inside, as a reactive `IBox`
 * (viewport top-left getters), so it drops straight into a gesture bound or a
 * `position_area` boundary. Built from an element (observed), a `BoxLike`
 * (reactive getters pass through; a plain box becomes an OWNED, editable
 * region), or nothing (the live viewport).
 *
 * `constrain()` is the pure clamp every composition builds on
 * (`overlay.set(c.constrain(box))`); `dock()` is a saturated clamp for
 * flush-to-edge placement — the JS replacement for the retired zero-JS CSS
 * center-clamp docking.
 */
export class Constraint implements IBox {
  #read: () => IBox;
  /** The owned region when built from a plain box — editable. */
  #owned: Signal<IBox> | undefined;

  constructor(source?: Element | BoxLike) {
    if (source === undefined) {
      this.#read = () => WINDOW_BOX;
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

  get x(): number {
    return this.#read().x;
  }
  get y(): number {
    return this.#read().y;
  }
  get w(): number {
    return this.#read().w;
  }
  get h(): number {
    return this.#read().h;
  }

  /** Edit an owned (plain-box) region — re-clamps everything inside. */
  set(box: Partial<IBox>): void {
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
  constrain(box: PlainBox): IBox {
    const r = this.#read();
    const w = Math.min(box.w ?? 0, r.w);
    const h = Math.min(box.h ?? 0, r.h);
    return {
      x: clamp(box.x, r.x, Math.max(r.x + r.w - w, r.x)),
      y: clamp(box.y, r.y, Math.max(r.y + r.h - h, r.y)),
      w,
      h,
    };
  }

  /** Dock the box flush against one or more region edges — the JS
   * replacement for the old zero-JS CSS translate-clamp (`--overlay-y:
   * 9999px`). A saturated `constrain()`: `±Infinity` on an axis clamps to
   * its far/near edge, so `dock(box, "bottom")` sits flush at the bottom,
   * `dock(box, "bottom", "right")` in the corner — reactively. */
  dock(box: PlainBox, ...sides: ("top" | "bottom" | "left" | "right")[]): IBox {
    const docked: PlainBox = { ...box };
    for (const side of sides) {
      if (side === "top") docked.y = -Infinity;
      else if (side === "bottom") docked.y = Infinity;
      else if (side === "left") docked.x = -Infinity;
      else if (side === "right") docked.x = Infinity;
    }
    return this.constrain(docked);
  }
}

/** While JS drives geometry, its writes must land instantly — but ONLY
 * geometry. Enter/exit (opacity, scale) and close (display) keep
 * transitioning, so `@starting-style` still plays. */
export const INSTANT_TRANSITIONS = "opacity, scale, display";

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
