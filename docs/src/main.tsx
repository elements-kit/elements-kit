import "./styles.css";
import docsHtml from "./index.md";
import { MagicMoveDemo } from "./components/MagicMove";

const DEMO_STEPS = [
  // Step 1: bare signal
  `const count = signal(0);`,

  // Step 2: add computed
  `const count = signal(0);
const doubled = computed(() => count() * 2);`,

  // Step 3: class component
  `class Counter {
  count = signal(0);
  doubled = computed(() => this.count() * 2);

  render() {
    return (
      <div>
        <p>Count: {this.count}</p>
        <p>Doubled: {this.doubled}</p>
      </div>
    );
  }
}`,

  // Step 4: @reactive decorator
  `class Counter {
  @reactive() count = 0;
  doubled = computed(() => this.count * 2);

  render() {
    return (
      <div>
        <p>Count: {() => this.count}</p>
        <p>Doubled: {this.doubled}</p>
        <button on:click={() => this.count++}>+1</button>
      </div>
    );
  }
}`,

  // Step 5: full component
  `class Counter {
  @reactive() count = 0;
  doubled = computed(() => this.count * 2);

  render() {
    return (
      <div>
        <p>Count: {() => this.count} — Doubled: {this.doubled}</p>
        <button on:click={() => this.count++}>+1</button>
        <button on:click={() => this.count--}>−1</button>
        <button on:click={() => (this.count = 0)}>Reset</button>
      </div>
    );
  }
}`,
];

function mount() {
  // Inject pre-compiled Markdown HTML (highlighted by Shiki at build time)
  const app = document.getElementById("app");
  if (app) app.innerHTML = docsHtml as string;

  // Mount MagicMoveDemo into the placeholder left in the Markdown
  const el = document.getElementById("demo-magic-move");
  if (!el) return;

  const demo = new MagicMoveDemo();
  demo.steps = DEMO_STEPS;
  demo.lang = "tsx";
  demo.theme = "github-dark";
  el.replaceWith(demo.render());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
