import { signal, effect, effectScope, untracked } from "elements-kit/signals";
import { For } from "elements-kit/for";

const scopeLogs = signal<string[]>([]);
const user = signal("Alice");
const theme = signal("light");

const stop: () => void = effectScope(() => {
  effect(() => {
    const logs = untracked(scopeLogs);
    scopeLogs(logs.concat(`user: ${user()}`));
  });
  effect(() => {
    const logs = untracked(scopeLogs);
    scopeLogs(logs.concat(`theme: ${theme()}`));
  });
});

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">effectScope — grouped effects</h2>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
          <p>
            user: <strong>{() => user()}</strong>
            {" — "}
            theme: <strong>{() => theme()}</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onClick={() => user(user() === "Alice" ? "Bob" : "Alice")}>
              Toggle user
            </button>
            <button
              onClick={() => theme(theme() === "light" ? "dark" : "light")}
            >
              Toggle theme
            </button>
            <button onClick={() => stop()}>Stop all effects</button>
            <button onClick={() => scopeLogs([])}>Clear logs</button>
          </div>
          <div style="margin-top: 1rem;">
            <strong>Scope logs (stop = silence):</strong>
            <div
              style={{
                background: "#f9fafb",
                padding: "0.5rem",
                "border-radius": "4px",
                "max-height": "150px",
                overflow: "auto",
                "font-family": "monospace",
                "font-size": "0.85em",
              }}
            >
              <For each={scopeLogs} by={(_log: string, i: number) => i}>
                {(log: string) => <div>{log}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    ) as Element;
  }
}
