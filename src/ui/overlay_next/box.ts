import { effect, reactive } from "@/signals";
import { scope } from "@/signals/scope";
import { direction } from "@/utilities/direction";
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

export class ElementBox implements IBox, IDirection, Transformable {
  readonly element: HTMLElement;
  readonly transform: Box;
  readonly displacement: Displacement;

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

  constructor(element: HTMLElement) {
    this.element = element;
    // Seed the base from the element's measured geometry, so an unsized box
    // keeps its natural size — a 0 width would collapse `width: var(--w)`.
    const rect = element.getBoundingClientRect();
    this.transform = new Box(rect.left, rect.top, rect.width, rect.height);
    this.displacement = new Displacement(this);

    element.style.setProperty("top", "0");
    element.style.setProperty("left", "0");
    element.style.setProperty("translate", "var(--x, 0px) var(--y, 0px)");
    element.style.setProperty(
      "transform",
      "translate(var(--dx, 0px), var(--dy, 0px)) scale(var(--sx, 1), var(--sy, 1))",
    );
    element.style.setProperty("transform-origin", "top left");
    element.style.setProperty("width", "var(--w, auto)");
    element.style.setProperty("height", "var(--h, auto)");

    // Project the reactive base into its CSS channels — needs `effect`, or
    // the scope body runs once and never re-projects on a baseX change.
    [, this.dispose] = scope(() => {
      effect(() => {
        this.element.style.setProperty("--x", `${this.transform.x}px`);
        this.element.style.setProperty("--y", `${this.transform.y}px`);
        this.element.style.setProperty("--w", `${this.transform.w}px`);
        this.element.style.setProperty("--h", `${this.transform.h}px`);
      });
    });
  }

  /** The element's computed direction, read at call time. */
  get direction(): "ltr" | "rtl" {
    return getComputedStyle(this.element).direction === "rtl" ? "rtl" : "ltr";
  }

  dispose: () => void;
  [Symbol.dispose]() {
    this.dispose();
    this.displacement[Symbol.dispose]();
  }
}

export interface IDisplacement extends IBox {
  apply(): void;
}

export interface Transformable {
  displacement: IDisplacement;
}

class Displacement extends Box implements IDisplacement {
  readonly box: ElementBox;

  constructor(box: ElementBox) {
    super(0, 0, 0, 0);
    this.box = box;

    [, this.dispose] = scope(() => {
      effect(() => {
        this.box.element.style.setProperty("--dx", `${this.x}px`);
        this.box.element.style.setProperty("--dy", `${this.y}px`);
        this.box.element.style.setProperty("--dw", `${this.w}px`);
        this.#scale("--sx", this.box.transform.w, this.w); // live scale — CSS can't divide
        this.box.element.style.setProperty("--dh", `${this.h}px`);
        this.#scale("--sy", this.box.transform.h, this.h);
      });
    });
  }

  /** Live size delta as a scale ratio: (base + delta) / base. Computed here
   * because CSS calc can't divide a length by a length. */
  #scale(name: string, base: number, delta: number): void {
    this.box.element.style.setProperty(
      name,
      base ? `${(base + delta) / base}` : "1",
    );
  }

  /** Fold each live delta into its committed base, then zero the delta. The
   * visual geometry is unchanged (get = base + delta), so there's no jump. */
  apply() {
    this.box.x = this.box.transform.x + this.x;
    this.box.y = this.box.transform.y + this.y;
    this.box.w = this.box.transform.w + this.w;
    this.box.h = this.box.transform.h + this.h;
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
  }

  dispose: () => void;
  [Symbol.dispose]() {
    this.dispose();
  }
}
