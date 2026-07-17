import { reactive, signal } from "elements-kit/signals";
import { Children } from "elements-kit/jsx-runtime";

// ── Card Component with named slots ───────────────────────────────────────────
// `@slot()` declares each named slot as a plain property: reading places the
// region in the template, assigning fills it — `<CardComponent header={…}/>`
// in JSX, or `card.header = node` from anywhere.
class CardComponent {
  @reactive() header!: Children;
  @reactive() actions!: Children;
  @reactive() children!: Children;

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
          {this.header}
        </header>
        <main style="padding: 1rem">{this.children}</main>
        <footer style="padding: 0.75rem 1rem; border-top: 1px solid #e2e8f0; display: flex; gap: 8px">
          {this.actions}
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
        {/* Slot content via direct prop names */}
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
