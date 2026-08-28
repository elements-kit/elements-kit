import { MaybeReactive, reactive } from "@/signals";
import { direction } from "@/utilities/direction";
import { createElementRect } from "@/utilities/element-rect.ts";
import { windowSize } from "@/utilities/window-size.ts";

/** The channel axes a box value moves along. */
export type Axis = keyof ReadonlyBox;

export interface IDirection {
  readonly direction: "ltr" | "rtl";
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
