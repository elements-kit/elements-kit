import { batch, effect, reactive } from "@/signals/index.ts";
import { scope } from "@/signals/scope";
import { Box, IDirection, ReadonlyBox } from "./box.ts";
import type { IOrigin, Origin, OriginX, OriginY } from "./area.ts";

import { createElementRect } from "@/utilities/element-rect.ts";

export const AUTO = NaN;
class PartialBox implements Partial<Box> {
  @reactive() x: number | undefined;
  @reactive() y: number | undefined;
  @reactive() w: number | undefined;
  @reactive() h: number | undefined;

  constructor(
    x: number | undefined = undefined,
    y: number | undefined = undefined,
    w: number | undefined = undefined,
    h: number | undefined = undefined,
  ) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
}

class TransformableBox implements ReadonlyBox, Transformable {
  readonly transform: PartialBox;
  readonly displacement: Displacement;

  constructor(transform = new PartialBox()) {
    this.transform = transform;
    this.displacement = new Displacement(this);
  }

  get x() {
    return (this.transform.x ?? 0) + (this.displacement.x ?? 0);
  }
  set x(value: number) {
    this.transform.x = value;
  }
  get y() {
    return (this.transform.y ?? 0) + (this.displacement.y ?? 0);
  }
  set y(value: number) {
    this.transform.y = value;
  }

  get w() {
    return (this.transform.w ?? 0) + (this.displacement.w ?? 0);
  }
  set w(value: number) {
    this.transform.w = value;
  }

  get h() {
    return (this.transform.h ?? 0) + (this.displacement.h ?? 0);
  }
  set h(value: number) {
    this.transform.h = value;
  }
}

class Displacement extends PartialBox {
  readonly box: TransformableBox;

  constructor(box: TransformableBox) {
    super();
    this.box = box;
  }

  apply() {
    batch(() => {
      this.box.transform.x = (this.box.transform.x ?? 0) + (this.x ?? 0);
      this.box.transform.y = (this.box.transform.y ?? 0) + (this.y ?? 0);
      this.box.transform.w = (this.box.transform.w ?? 0) + (this.w ?? 0);
      this.box.transform.h = (this.box.transform.h ?? 0) + (this.h ?? 0);
      this.clear();
    });
  }

  clear() {
    batch(() => {
      this.x = undefined;
      this.y = undefined;
      this.w = undefined;
      this.h = undefined;
    });
  }
}

/** An origin keyword as the offset to shift back by. */
const OFFSET: Record<OriginX | OriginY, string> = {
  left: "0%",
  top: "0%",
  center: "50%",
  right: "100%",
  bottom: "100%",
};

export class OverlayBox extends TransformableBox implements IDirection, IOrigin {
  readonly element: HTMLElement;
  readonly #rect: ReturnType<typeof createElementRect>;
  // Neutral: the channels place the top-left corner, so no shift.
  #origin: Origin = { x: "left", y: "top" };

  constructor(element: HTMLElement) {
    super();
    this.element = element;
    this.#rect = createElementRect(element);

    element.style.setProperty("top", "0");
    element.style.setProperty("left", "0");
    // `--_ox/--_oy` are percentages of this box, so the shift needs no
    // measurement. Subtracted: the channels place the top-left corner.
    element.style.setProperty(
      "translate",
      "calc(var(--x, 0px) + var(--dx, 0px) + var(--_ex, 0px) - var(--_ox, 0%)) " +
        "calc(var(--y, 0px) + var(--dy, 0px) + var(--_ey, 0px) - var(--_oy, 0%))",
    );

    // Project the reactive base into its CSS channels — needs `effect`, or
    // the scope body runs once and never re-projects on a baseX change.
    const [, stop] = scope(() => {
      effect(() => {
        this.#project("--x", this.transform.x);
      });
      effect(() => {
        this.#project("--y", this.transform.y);
      });
      effect(() => {
        this.#project("--w", this.transform.w, this.displacement.w);
      });
      effect(() => {
        this.#project("--h", this.transform.h, this.displacement.h);
      });
      effect(() => {
        this.#project("--dx", this.displacement.x);
      });
      effect(() => {
        this.#project("--dy", this.displacement.y);
      });
    });
    this.dispose = () => {
      stop();
      this.#rect[Symbol.dispose]();
    };
  }

  /** The box point that lands on (x, y), and the scale's origin. */
  get origin(): Origin {
    return this.#origin;
  }
  set origin({ x, y }: Origin) {
    this.#origin = { x, y };
    // A keyword cannot be negated, so the channels take it as a length.
    this.element.style.setProperty("--_ox", OFFSET[x]);
    this.element.style.setProperty("--_oy", OFFSET[y]);
    this.element.style.transformOrigin = `${x} ${y}`;
  }

  /** Write a size channel, or unset it when the axis is AUTO (NaN) so the
   * element falls back to content sizing (`var(--w, auto)`). */
  #project(name: string, ...value: (number | undefined)[]): void {
    if (value.every((v) => v === undefined || Number.isNaN(v))) {
      this.element.style.removeProperty(name);
      return;
    }
    const sum = value.reduce<number>((a, b) => a + (b ?? 0), 0);
    this.element.style.setProperty(name, `${sum}px`);
  }

  get w(): number {
    return this.#rect().width;
  }
  set w(value: number) {
    this.transform.w = value;
  }

  get h(): number {
    return this.#rect().height;
  }
  set h(value: number) {
    this.transform.h = value;
  }

  get x(): number {
    return this.#rect().left;
  }
  set x(value: number) {
    this.transform.x = value;
  }

  get y(): number {
    return this.#rect().top;
  }
  set y(value: number) {
    this.transform.y = value;
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
