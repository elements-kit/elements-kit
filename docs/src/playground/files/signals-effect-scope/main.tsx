import { For } from "elements-kit/for";
import { scopeLogs, user, theme, stop } from "./scope";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">effectScope — grouped effects</h2>
        <div style="border: 1px solid #8884; border-radius: 8px; padding: 1rem;">
          <p>
            user: <strong>{() => user()}</strong>
            {" — "}
            theme: <strong>{() => theme()}</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button on:click={() => user(user() === "Alice" ? "Bob" : "Alice")}>
              Toggle user
            </button>
            <button
              on:click={() => theme(theme() === "light" ? "dark" : "light")}
            >
              Toggle theme
            </button>
            <button on:click={() => stop()}>Stop all effects</button>
            <button on:click={() => scopeLogs([])}>Clear logs</button>
          </div>
          <div style="margin-top: 1rem;">
            <strong>Scope logs (stop = silence):</strong>
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
              <For each={scopeLogs} by={(_log, i) => i}>
                {(log) => <div>{log}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
