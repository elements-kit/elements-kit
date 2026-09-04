import { MaybeReactive, reactive, resolve } from "@/signals";
import { direction } from "@/utilities/direction";
import { createElementRect } from "@/utilities/element-rect.ts";
import { windowSize } from "@/utilities/window-size.ts";

/** The channel axes a box value moves along. */
export type Axis = keyof ReadonlyBox;

export interface IDirection {
  readonly direction: "ltr" | "rtl";
}

export interface Point {
  x: number;
  y: number;
}

export interface ReadonlyPoint {
  readonly x: number;
  readonly y: number;
}

export interface ReadonlyBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export interface Box extends ReadonlyBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class WindowBox implements ReadonlyBox, IDirection {
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
 * A box grown by a margin per side — the offset off an anchor, as CSS spells
 * it. The sides default like the `margin` shorthand: one value is every side,
 * two is block then inline, three is top/inline/bottom.
 *
 * Every field is assignable and reactive, and each also takes a signal — so
 * the box or a side can be swapped, or driven. Reads through, so it tracks
 * whatever the wrapped box tracks.
 */
export class MarginBox implements ReadonlyBox {
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

export class ElementBox implements ReadonlyBox {
  #rect: ReturnType<typeof createElementRect>;
  constructor(el: MaybeReactive<Element>) {
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
