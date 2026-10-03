import { For } from "elements-kit/for";
import { count2, secret, untrackedLogs } from "./state";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">untracked — read without subscribing</h2>
        <div style="border: 1px solid #8884; border-radius: 8px; padding: 1rem;">
          <p>
            count: <strong>{() => count2()}</strong>
            {" — "}
            secret: <strong>{() => secret()}</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button on:click={() => count2(count2() + 1)}>
              count +1 (tracked)
            </button>
            <button
              on:click={() =>
                secret(secret() === "hidden" ? "visible" : "hidden")
              }
            >
              Toggle secret
            </button>
            <button on:click={() => untrackedLogs([])}>Clear logs</button>
          </div>
          <div style="margin-top: 1rem;">
            <strong>Logs (secret changes don't trigger re-run):</strong>
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
              <For each={untrackedLogs} by={(_log, i) => i}>
                {(log) => <div>{log}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
