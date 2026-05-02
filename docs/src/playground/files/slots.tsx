import { signal } from "elements-kit/signals";
import { Slot } from "elements-kit/slot";
import type { Props } from "elements-kit/jsx-runtime";

// ── Card Component with named slots ───────────────────────────────────────────
// Plain class component — no inherited DOM surface, so slots can be plain
// instance fields. The `[SLOTS]` symbol exists to avoid collisions on custom
// elements (HTMLElement subclasses); plain components don't need it.
export type CardProps = Props<CardComponent>;

class CardComponent {
  // Phantom constructor: JSX reads this signature to infer accepted props.
  constructor(_props?: CardProps) {}

  header = new Slot();
  actions = new Slot();
  children = new Slot();

  render() {
    return (
      <article
        style="
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        max-width: 320px;
        font-family: sans-serif;
      "
      >
        <header style="padding: 1rem; border-bottom: 1px solid #e2e8f0; background: #f7fafc">
          {this.header.render("Untitled")}
        </header>
        <main style="padding: 1rem">{this.children.render()}</main>
        <footer style="padding: 0.75rem 1rem; border-top: 1px solid #e2e8f0; display: flex; gap: 8px">
          {this.actions.render()}
        </footer>
      </article>
    );
  }
}

// ── App ───────────────────────────────────────────────────────────────────────
const cardTitle = signal("My Card");

export class App {
  render() {
    return (
      <div style="padding: 2rem; display: flex; flex-direction: column; gap: 1rem">
        {/* Slot content via direct prop names (no slot:* needed for plain components) */}
        <CardComponent
          header={<h2 style="margin: 0">{cardTitle}</h2>}
          actions={
            <>
              <button on:click={() => cardTitle("Updated!")}>
                Update title
              </button>
              <button on:click={() => cardTitle("My Card")}>Reset</button>
            </>
          }
        >
          <p style="margin: 0">This content goes in the default slot.</p>
          <p style="margin: 0.5rem 0 0">
            The header slot reacts to signal changes.
          </p>
        </CardComponent>
      </div>
    );
  }
}
