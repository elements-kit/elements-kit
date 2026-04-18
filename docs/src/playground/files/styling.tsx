import { reactive, computed } from "elements-kit/signals";
import { render } from "elements-kit/render";

// ── Stylesheet — created once, shared by all instances ────────────────────────
const sheet = new CSSStyleSheet();
sheet.replaceSync(`
:host {
  display: block;
  font-family: sans-serif;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  max-width: 240px;
}
p { margin: 0 0 0.75rem; font-size: 1.25rem; }
.controls { display: flex; gap: 8px; }
button {
  padding: 4px 12px;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  cursor: pointer;
  background: #fff;
}
button:hover { background: #f7fafc; }
`);

// ── Element ───────────────────────────────────────────────────────────────────
class CounterElement extends HTMLElement {
  @reactive() count = 0;
  doubled = computed(() => this.count * 2);

  #unmount?: () => void;

  #template = () => (
    <div>
      <p>
        <strong>{() => this.count}</strong>
        {" × 2 = "}
        <strong>{this.doubled}</strong>
      </p>
      <div class="controls">
        <button onClick={() => this.count++}>+1</button>
        <button onClick={() => this.count--}>−1</button>
        <button onClick={() => (this.count = 0)}>Reset</button>
      </div>
    </div>
  );

  connectedCallback() {
    // Shadow DOM — styles are scoped, sheet is shared
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [sheet];

    this.#unmount = render(shadow, this.#template);
  }

  disconnectedCallback() {
    this.#unmount?.();
    this.#unmount = undefined;
  }
}

customElements.define("x-counter", CounterElement);

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "x-counter": Record<string, unknown>;
    }
  }
}

// Mount three instances — all share the same parsed stylesheet
export class App {
  render() {
    return (
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding: 1rem">
        <x-counter />
        <x-counter />
        <x-counter />
      </div>
    );
  }
}
