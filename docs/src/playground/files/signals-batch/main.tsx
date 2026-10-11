import { For } from "elements-kit/for";
import { x, y, batchLogs, addTenToBoth } from "./state";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">
          Batch — multiple writes, single notification
        </h2>
        <div style="border: 1px solid #8884; border-radius: 8px; padding: 1rem;">
          <p>
            x: <strong>{() => x()}</strong>
            {" — "}
            y: <strong>{() => y()}</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button on:click={() => x(x() + 1)}>x +1</button>
            <button on:click={() => y(y() + 1)}>y +1</button>
            <button on:click={addTenToBoth}>Batch (x+10, y+10)</button>
            <button on:click={() => batchLogs([])}>Clear logs</button>
          </div>
          <div style="margin-top: 1rem;">
            <strong>Effect logs (batch = 1 log, separate = 2 logs):</strong>
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
              <For each={batchLogs} by={(log) => log}>
                {(log) => <div>{log}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
