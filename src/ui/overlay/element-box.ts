import { effect, type MaybeReactive, reactive } from "@/signals";
import { scope } from "@/signals/scope";
import { direction } from "@/utilities/direction";
import { createElementRect } from "@/utilities/element-rect.ts";
import { windowSize } from "@/utilities/window-size.ts";

/** Structural box input — any object with these fields, reactive or plain
 * (`{ x: () => mx(), y: 0 }`), so an `Overlay` can be another's anchor or a
 * constraint source. `w`/`h` omitted mean a zero-size box (a dot). */
export interface BoxLike {
  x: MaybeReactive<number>;
  y: MaybeReactive<number>;
  w?: MaybeReactive<number>;
  h?: MaybeReactive<number>;
}

/** A resolved box — plain numbers, viewport top-left; size optional. */
export type PlainBox = { x: number; y: number; w?: number; h?: number };

/** The channel axes a box value moves along. */
export type Axis = "x" | "y" | "w" | "h";

/** Resolve a possibly-reactive field (any getter — reactive literals, Box
 * getters — not just branded signals). Numbers are never callable. */
export const readValue = (v: MaybeReactive<number> | undefined): number =>
  typeof v === "function" ? (v as () => number)() : (v ?? 0);

/** Resolve a whole `BoxLike` to plain numbers. */
export const readBox = (box: BoxLike): IBox => ({
  x: readValue(box.x),
  y: readValue(box.y),
  w: readValue(box.w),
  h: readValue(box.h),
});

/** Whether any field is a getter (the box re-derives over time). */
export const isReactiveBox = (box: BoxLike): boolean =>
  typeof box.x === "function" ||
  typeof box.y === "function" ||
  typeof box.w === "function" ||
  typeof box.h === "function";

/**
 * The reactive box model — the overlay geometry foundation. A box is
 * viewport top-left coordinates: base geometry (`transform`) plus a
 * transient drag `displacement`. `ElementBox` projects both to CSS, with
 * ALL position on the single `translate` property so one CSS transition
 * glides a settle/morph (base and delta are the same property, as the old
 * channel model had them):
 *   `--x/--y`   base position   ─┐
 *   `--dx/--dy` live drag delta   ├─ summed into `translate`
 *   `--_ex/--_ey` enter/exit slide ┘  (default 0 — overlay.css sets them)
 *   `--w/--h`   REAL size (base + live resize delta) → `width`/`height`
 * A resize grows the actual box, not a `scale`, so content never distorts;
 * there is no `transform`.
 */

export interface IBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IDirection {
  readonly direction: "ltr" | "rtl";
}

/** Assign to a size channel (`box.h = AUTO`) to hand it back to content sizing
 * (CSS `auto`) instead of a pinned number: the channel is left unset, the
 * getter measures the element on read, and a resize freezes it on grab.
 * Position channels are always driven. */
export const AUTO = NaN;

export class BaseBox implements IBox {
  @reactive() x: number;
  @reactive() y: number;
  @reactive() w: number;
  @reactive() h: number;

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
}

export class Box implements IBox, Transformable {
  readonly transform: BaseBox;
  readonly displacement: Displacement;

  constructor(transform = new BaseBox(0, 0, 0, 0)) {
    this.transform = transform;
    this.displacement = new Displacement(this);
  }

  get x() {
    return this.transform.x + this.displacement.x;
  }
  set x(value: number) {
    this.transform.x = value;
  }

  get y() {
    return this.transform.y + this.displacement.y;
  }
  set y(value: number) {
    this.transform.y = value;
  }

  get w() {
    return this.transform.w + this.displacement.w;
  }
  set w(value: number) {
    this.transform.w = value;
  }

  get h() {
    return this.transform.h + this.displacement.h;
  }
  set h(value: number) {
    this.transform.h = value;
  }
}

class Displacement extends BaseBox {
  readonly box: Box;

  constructor(box: Box) {
    super(0, 0, 0, 0);
    this.box = box;
  }

  /** Fold each live delta into its committed base, then zero the delta. A
   * numeric fold on the raw base, so an AUTO axis with no delta stays auto
   * (`NaN + 0 = NaN`) — a position drag never pins size. Freezing an auto axis
   * to its measured size is a resize concern (see `Resizable`). The visual
   * geometry is unchanged (get = base + delta), so there's no jump. */
  apply() {
    this.box.x = this.box.transform.x + this.x;
    this.box.y = this.box.transform.y + this.y;
    this.box.w = this.box.transform.w + this.w;
    this.box.h = this.box.transform.h + this.h;
    this.clear();
  }

  clear() {
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
  }
}

export class WindowBox implements IBox, IDirection {
  get x() {
    return 0;
  }
  get y() {
    return 0;
  }
  get w() {
    return windowSize.width();
  }
  get h() {
    return windowSize.height();
  }

  get direction() {
    return direction();
  }
}

export const WINDOW_BOX = new WindowBox();

export class ElementBox extends Box implements IDirection {
  readonly element: HTMLElement;
  /** The element's live rendered rect — REACTIVE (a `ResizeObserver`), so an
   * AUTO axis re-places its followers (`position_area`) when the panel
   * measures. Reuses the shared `createElementRect` utility. */
  readonly #rect: ReturnType<typeof createElementRect>;

  constructor(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    // Capture the element's current geometry — position AND size — so the box
    // persists it (an anchor keeps its measured w/h). Assign `AUTO` to a size
    // channel to hand it back to content sizing (`var(--w, auto)`); the getter
    // then measures on read and a resize freezes it on grab.
    super(new BaseBox(rect.left, rect.top, rect.width, rect.height));
    this.element = element;
    this.#rect = createElementRect(element);

    element.style.setProperty("top", "0");
    element.style.setProperty("left", "0");
    // ALL position on `translate`: base + live drag delta + enter/exit slide
    // (all default 0). One property, so a single CSS transition glides a
    // settle or morph — and with no clamp, a plain translate interpolates.
    element.style.setProperty(
      "translate",
      "calc(var(--x, 0px) + var(--dx, 0px) + var(--_ex, 0px)) " +
        "calc(var(--y, 0px) + var(--dy, 0px) + var(--_ey, 0px))",
    );
    // Size rides the real `--w/--h` (base + live resize delta) — no `scale`,
    // so content never distorts.
    element.style.setProperty("width", "var(--w, auto)");
    element.style.setProperty("height", "var(--h, auto)");

    // Project the reactive base into its CSS channels — needs `effect`, or
    // the scope body runs once and never re-projects on a baseX change.
    const [, stop] = scope(() => {
      effect(() => {
        this.element.style.setProperty("--x", `${this.transform.x}px`);
        this.element.style.setProperty("--y", `${this.transform.y}px`);
      });
      effect(() => {
        // Real size — base + live resize delta — so the actual box grows.
        this.#project("--w", this.transform.w + this.displacement.w);
        this.#project("--h", this.transform.h + this.displacement.h);
      });
      effect(() => {
        this.element.style.setProperty("--dx", `${this.displacement.x}px`);
        this.element.style.setProperty("--dy", `${this.displacement.y}px`);
      });
    });
    this.dispose = () => {
      stop();
      this.#rect[Symbol.dispose]();
    };
  }

  /** Write a size channel, or unset it when the axis is AUTO (NaN) so the
   * element falls back to content sizing (`var(--w, auto)`). */
  #project(name: string, value: number): void {
    if (Number.isNaN(value)) this.element.style.removeProperty(name);
    else this.element.style.setProperty(name, `${value}px`);
  }

  /** An AUTO size (NaN base) resolves to the element's laid-out content size —
   * the REACTIVE `#measured` signal (kept current by a `ResizeObserver`), so a
   * follower re-runs when the panel measures. */
  get w(): number {
    const base = this.transform.w;
    const resolved = Number.isNaN(base) ? this.#rect.width() : base;
    return resolved + this.displacement.w;
  }
  set w(value: number) {
    this.transform.w = value;
  }
  get h(): number {
    const base = this.transform.h;
    const resolved = Number.isNaN(base) ? this.#rect.height() : base;
    return resolved + this.displacement.h;
  }
  set h(value: number) {
    this.transform.h = value;
  }

  /** The reactive BASE size (committed base, or measured when AUTO) WITHOUT the
   * live drag displacement — for followers (docking) that must track the
   * settled size, not fight a resize gesture mid-drag. */
  protected get measuredW(): number {
    return Number.isNaN(this.transform.w) ? this.#rect.width() : this.transform.w;
  }
  protected get measuredH(): number {
    return Number.isNaN(this.transform.h) ? this.#rect.height() : this.transform.h;
  }

  /** The element's computed direction, read at call time. */
  get direction(): "ltr" | "rtl" {
    return getComputedStyle(this.element).direction === "rtl" ? "rtl" : "ltr";
  }

  dispose: () => void;
  [Symbol.dispose]() {
    this.dispose();
  }
}

export interface Transformable {
  displacement: Displacement;
}
