import {
  signal,
  effect,
  batch,
  untracked,
  trigger,
} from "elements-kit/signals";
import { For } from "elements-kit";

const x = signal(1);
const y = signal(2);
const batchLogs = signal<string[]>([]);

effect(() => {
  untracked(batchLogs).push(`x: ${x()}, y: ${y()}`);
  trigger(batchLogs);
});

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">Batch — multiple writes, single notification</h2>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
          <p>
            x: <strong>{() => x()}</strong>
            {" — "}
            y: <strong>{() => y()}</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onClick={() => x(x() + 1)}>x +1</button>
            <button onClick={() => y(y() + 1)}>y +1</button>
            <button
              onClick={() =>
                batch(() => {
                  x(x() + 10);
                  y(y() + 10);
                })
              }
            >
              Batch (x+10, y+10)
            </button>
            <button onClick={() => batchLogs([])}>Clear logs</button>
          </div>
          <div style="margin-top: 1rem;">
            <strong>Effect logs (batch = 1 log, separate = 2 logs):</strong>
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
              <For each={batchLogs} by={(log: string) => log}>
                {(log: string) => <div>{log}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    ) as Element;
  }
}
