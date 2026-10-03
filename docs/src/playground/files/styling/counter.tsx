import { reactive, computed } from "elements-kit/signals";
import { render } from "elements-kit/render";
import { counterSheet } from "./counter.styles";

export class CounterElement extends HTMLElement {
  @reactive() count = 0;

  // Private: excluded from ElementProps so JSX doesn't type `doubled` as a
  // settable prop. Public readers should expose it via a getter if needed.
  readonly #doubled = computed(() => this.count * 2);

  #unmount?: () => void;

  #template = () => (
    <div>
      <p>
        <strong>{() => this.count}</strong>
        {" × 2 = "}
        <strong>{this.#doubled}</strong>
      </p>
      <div class="controls">
        <button on:click={() => this.count++}>+1</button>
        <button on:click={() => this.count--}>−1</button>
        <button on:click={() => (this.count = 0)}>Reset</button>
      </div>
    </div>
  );

  connectedCallback() {
    // Shadow DOM — styles are scoped, sheet is shared
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [counterSheet];

    this.#unmount = render(shadow, this.#template);
  }

  disconnectedCallback() {
    this.#unmount?.();
    this.#unmount = undefined;
  }
}

customElements.define("x-counter2", CounterElement);

declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {
      "x-counter2": typeof CounterElement;
    }
  }
}
