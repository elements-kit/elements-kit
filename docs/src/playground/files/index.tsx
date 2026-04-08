import { signal, reactive, computed } from "elements-kit/signals";
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";

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

  connectedCallback() {
    this.appendChild(
      <section style="margin-bottom: 24px">
        <h2>Counter</h2>
        <p>
          Count: <strong>{this.#count}</strong> — Doubled:{" "}
          <strong>{this.doubled}</strong>
        </p>
        <button onClick={() => this.count++}>+1</button>{" "}
        <button onClick={() => this.count--}>−1</button>{" "}
        <button onClick={() => (this.count = 0)}>Reset</button>
      </section>,
    );
  }
}
customElements.define("x-counter", Counter);

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "x-counter": Counter;
    }
  }
}

class App {
  render() {
    return (<x-counter count={signal(9)} />) as Element;
  }
}

// ─ Mount ─────────────────────────────────────────────────────────────────────
const appRoot = document.getElementById("app")!;
appRoot.appendChild(new App().render());
