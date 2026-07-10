import { Computed, computed, reactive, signal, Signal } from "@/signals";
import { direction } from "@/utilities/direction";
import { createElementRect } from "@/utilities/element-rect";
import { windowSize } from "@/utilities/window-size.ts";

export interface IBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IDirection {
  readonly direction: "ltr" | "rtl";
}

export class Box implements IBox {
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

export class ElementBox implements IBox, IDirection {
  #element: Signal<HTMLElement>;
  #rect: Computed<ReturnType<typeof createElementRect>>;

  /** The element's computed direction, read at call time. */
  get direction(): "ltr" | "rtl" {
    return getComputedStyle(this.#element()).direction === "rtl"
      ? "rtl"
      : "ltr";
  }

  get x() {
    return this.#rect().x();
  }
  set x(value: number) {
    const el = this.#element();
    el.style.setProperty("--x", `${value}px`);
  }
  get y() {
    return this.#rect().y();
  }
  set y(value: number) {
    const el = this.#element();
    el.style.setProperty("--y", `${value}px`);
  }
  get w() {
    return this.#rect().width();
  }
  set w(value: number) {
    const el = this.#element();
    el.style.setProperty("--w", `${value}px`);
  }
  get h() {
    return this.#rect().height();
  }
  set h(value: number) {
    const el = this.#element();
    el.style.setProperty("--h", `${value}px`);
  }

  constructor(public element: HTMLElement) {
    this.#element = signal(element);
    this.#rect = computed(() => createElementRect(this.#element()));
  }
}
