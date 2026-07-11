import { reactive, signal, Signal } from "@/signals";
import { direction } from "@/utilities/direction";
import { windowSize } from "@/utilities/window-size.ts";

export interface IBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ITransform extends IBox {
  apply(): void;
}

export interface Transformable {
  transform: ITransform;
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

export class ElementBox implements IBox, IDirection, Transformable {
  readonly element: HTMLElement;
  readonly transform: Transform;
  // Driven geometry — signal-backed so reads reflect writes and are
  // reactive (a measured rect can't see translate/position writes anyway).
  #x: Signal<number>;
  #y: Signal<number>;
  #w: Signal<number>;
  #h: Signal<number>;

  /** The element's computed direction, read at call time. */
  get direction(): "ltr" | "rtl" {
    return getComputedStyle(this.element).direction === "rtl" ? "rtl" : "ltr";
  }

  get x() {
    return this.#x();
  }

  set x(value: number) {
    this.#x(value);
    this.element.style.setProperty("--x", `${value}px`);
  }

  get y() {
    return this.#y();
  }
  set y(value: number) {
    this.#y(value);
    this.element.style.setProperty("--y", `${value}px`);
  }

  get w() {
    return this.#w();
  }
  set w(value: number) {
    this.#w(value);
    this.element.style.setProperty("--w", `${value}px`);
  }

  get h() {
    return this.#h();
  }
  set h(value: number) {
    this.#h(value);
    this.element.style.setProperty("--h", `${value}px`);
  }

  constructor(element: HTMLElement) {
    this.element = element;
    this.transform = new Transform(this);
    const rect = element.getBoundingClientRect();
    this.#x = signal(rect.left);
    this.#y = signal(rect.top);
    this.#w = signal(rect.width);
    this.#h = signal(rect.height);

    element.style.setProperty("translate", "var(--x, 0px) var(--y, 0px)");
    element.style.setProperty(
      "transform",
      "translate(var(--dx, 0px), var(--dy, 0px)) scale(var(--sx, 1), var(--sy, 1))",
    );
    element.style.setProperty("transform-origin", "top left");
    element.style.setProperty("width", "var(--w, auto)");
    element.style.setProperty("height", "var(--h, auto)");
  }
}

class Transform implements ITransform {
  readonly box: ElementBox;

  constructor(element: ElementBox) {
    this.box = element;
  }

  get x() {
    return this.#read("--dx");
  }
  set x(value: number) {
    this.box.element.style.setProperty("--dx", `${value}px`);
  }
  get y() {
    return this.#read("--dy");
  }
  set y(value: number) {
    this.box.element.style.setProperty("--dy", `${value}px`);
  }
  get w() {
    return this.#read("--dw");
  }
  set w(value: number) {
    this.box.element.style.setProperty("--dw", `${value}px`);
    this.#scale("--sx", this.box.w, value); // live scale — CSS can't divide
  }
  get h() {
    return this.#read("--dh");
  }
  set h(value: number) {
    this.box.element.style.setProperty("--dh", `${value}px`);
    this.#scale("--sy", this.box.h, value);
  }

  /** Live size delta as a scale ratio: (base + delta) / base. Computed here
   * because CSS calc can't divide a length by a length. */
  #scale(name: string, base: number, delta: number): void {
    this.box.element.style.setProperty(
      name,
      base ? `${(base + delta) / base}` : "1",
    );
  }

  /** Read a delta channel back from the element's inline style — no
   * getComputedStyle recalc; an unset channel reads 0. */
  #read(name: string): number {
    return parseFloat(this.box.element.style.getPropertyValue(name)) || 0;
  }

  apply() {
    this.box.x += this.x;
    this.box.y += this.y;
    this.box.w += this.w;
    this.box.h += this.h;
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
  }
}
