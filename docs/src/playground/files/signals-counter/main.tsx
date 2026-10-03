import { For } from "elements-kit/for";
import { count, doubled, logs } from "./counter";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">Counter — signal + computed + effect</h2>
        <div style="border: 1px solid #8884; border-radius: 8px; padding: 1rem;">
          <p>
            Count: <strong>{() => count()}</strong>
            {" — "}
            Doubled: <strong>{doubled}</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button on:click={() => count(count() + 1)}>+1</button>
            <button on:click={() => count(count() - 1)}>−1</button>
            <button on:click={() => count(0)}>Reset</button>
          </div>
          <div style="margin-top: 1rem;">
            <strong>Effect logs:</strong>
            <div
              style={{
                background: "#8881",
                padding: "0.5rem",
                borderRadius: "4px",
                maxHeight: "150px",
                overflow: "auto",
                fontFamily: "monospace",
                fontSize: "0.85em",
              }}
            >
              <For each={logs} by={(_log, i) => i}>
                {(log) => <div>{log}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
