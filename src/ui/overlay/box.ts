import { MaybeReactive, reactive, resolve } from "@/signals";
import { direction } from "@/utilities/direction";
import { createElementRect } from "@/utilities/element-rect.ts";
import { visualViewport } from "@/utilities/visual-viewport.ts";
import { windowSize } from "@/utilities/window-size.ts";
import type { Region } from "./area.ts";

export interface IDirection {
  readonly direction: "ltr" | "rtl";
}

export interface Point {
  x: number;
  y: number;
}

export interface ReadonlyBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A box that is also a {@link Region}: its edges read through `x/y/w/h`,
 * so it bounds anything a region does. */
export abstract class RegionBox implements ReadonlyBox, Region {
  abstract readonly x: number;
  abstract readonly y: number;
  abstract readonly w: number;
  abstract readonly h: number;

  get xmin() {
    return this.x;
  }
  get xmax() {
    return this.x + this.w;
  }
  get ymin() {
    return this.y;
  }
  get ymax() {
    return this.y + this.h;
  }
}

export class WindowBox extends RegionBox implements IDirection {
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

/**
 * The visual viewport as a box: the window minus whatever the software
 * keyboard or pinch-zoom takes, positioned where it sits in the layout
 * viewport.
 *
 * iOS never resizes the layout viewport for the keyboard, so `WINDOW_BOX`
 * (and `svh`) keep reporting the full screen — a surface docked to their
 * block-end edge ends up under the keyboard. Dock to this one instead.
 */
export class ViewportBox extends RegionBox implements IDirection {
  get x() {
    return visualViewport.offsetLeft();
  }
  get y() {
    return visualViewport.offsetTop();
  }
  get w() {
    return visualViewport.width();
  }
  get h() {
    return visualViewport.height();
  }

  get direction() {
    return direction();
  }
}

export const VIEWPORT_BOX = new ViewportBox();

/**
 * A box grown by a margin per side — the offset off an anchor, as CSS spells
 * it. The sides default like the `margin` shorthand: one value is every side,
 * two is block then inline, three is top/inline/bottom.
 *
 * Every field is assignable and reactive, and each also takes a signal — so
 * the box or a side can be swapped, or driven. Reads through, so it tracks
 * whatever the wrapped box tracks.
 */
export class MarginBox extends RegionBox {
  @reactive() box: MaybeReactive<ReadonlyBox>;
  @reactive() top: MaybeReactive<number>;
  @reactive() right: MaybeReactive<number>;
  @reactive() bottom: MaybeReactive<number>;
  @reactive() left: MaybeReactive<number>;

  constructor(
    box: MaybeReactive<ReadonlyBox>,
    top: MaybeReactive<number> = 0,
    right: MaybeReactive<number> = top,
    bottom: MaybeReactive<number> = top,
    left: MaybeReactive<number> = right,
  ) {
    super();
    this.box = box;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
  }

  get x() {
    return resolve(this.box).x - resolve(this.left);
  }
  get y() {
    return resolve(this.box).y - resolve(this.top);
  }
  get w() {
    return resolve(this.box).w + resolve(this.left) + resolve(this.right);
  }
  get h() {
    return resolve(this.box).h + resolve(this.top) + resolve(this.bottom);
  }
}

export class ElementBox extends RegionBox {
  #rect: ReturnType<typeof createElementRect>;
  constructor(el: MaybeReactive<Element>) {
    super();
    this.#rect = createElementRect(el);
  }
  [Symbol.dispose]() {
    this.#rect[Symbol.dispose]();
  }
  get x() {
    return this.#rect().left;
  }
  get y() {
    return this.#rect().top;
  }
  get w() {
    return this.#rect().width;
  }
  get h() {
    return this.#rect().height;
  }
}
