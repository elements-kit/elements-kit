import { signal, Signal } from "@/signals";
import { ElementBox, IBox, WINDOW_BOX } from "./box";

export class Overlay extends ElementBox {
  #anchor: Signal<IBox>;
  #constraint: Signal<IBox>;

  #dispose = () => {};
  [Symbol.dispose]() {
    this.#dispose();
  }

  constructor(
    element: HTMLElement,
    anchor: IBox,
    constraint: IBox = WINDOW_BOX,
  ) {
    super(element);
    this.#anchor = signal(anchor);
    this.#constraint = signal(constraint);
  }
}
