import {
  signal,
  computed,
  effect,
  untracked,
  trigger,
} from "elements-kit/signals";
import { For } from "elements-kit/for";

const count = signal(0);
const doubled = computed(() => count() * 2);
const logs = signal<string[]>([]);

effect(() => {
  untracked(logs).push(`count: ${count()}, doubled: ${doubled()}`);
  trigger(logs);
});

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">Counter — signal + computed + effect</h2>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
          <p>
            Count: <strong>{() => count()}</strong>
            {" — "}
            Doubled: <strong>{doubled}</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onClick={() => count(count() + 1)}>+1</button>
            <button onClick={() => count(count() - 1)}>−1</button>
            <button onClick={() => count(0)}>Reset</button>
          </div>
          <div style="margin-top: 1rem;">
            <strong>Effect logs:</strong>
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
