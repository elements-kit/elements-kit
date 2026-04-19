import { signal, reactive, computed } from "elements-kit/signals";
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";
import { render } from "elements-kit/render";

@attributes
class Counter extends HTMLElement {
  static [attr] = {
    count(this: Counter, value: string | null) {
      this.count = Number(value);
    },
  };

  #count = signal(0);

  @reactive((s) => s.#count)
  count: number = 0;

  readonly doubled = computed(() => this.count * 2);

  #unmount?: () => void;

  #template = () => (
    <section style="margin-bottom: 24px">
      <h2>Counter</h2>
      <p>
        Count: <strong>{this.#count}</strong> — Doubled:{" "}
        <strong>{this.doubled}</strong>
      </p>
      <button on:click={() => this.count++}>+1</button>{" "}
      <button on:click={() => this.count--}>−1</button>{" "}
      <button on:click={() => (this.count = 0)}>Reset</button>
    </section>
  );

  connectedCallback() {
    this.#unmount = render(this, this.#template);
  }

  disconnectedCallback() {
    this.#unmount?.();
    this.#unmount = undefined;
  }
}
customElements.define("x-counter", Counter);

declare module "elements-kit/custom-elements" {
  interface CustomElementRegistry {
    "x-counter": typeof Counter;
  }
}

export class App {
  render() {
    return <x-counter count={signal(9)} />;
  }
}
