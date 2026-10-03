import { For } from "elements-kit/for";
import { url, fetchLogs, abortCount } from "./fetcher";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">onCleanup — fetch with abort</h2>
        <div style="border: 1px solid #8884; border-radius: 8px; padding: 1rem;">
          <p>
            URL: <strong>{() => url()}</strong>
            {" — "}
            Abort count: <strong>{abortCount}</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button on:click={() => url("/api/data")}>Fetch /api/data</button>
            <button on:click={() => url("/api/users")}>Fetch /api/users</button>
            <button on:click={() => url("/api/posts")}>Fetch /api/posts</button>
          </div>
          <div style="margin-top: 1rem;">
            <strong>Fetch logs:</strong>
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
              <For each={fetchLogs} by={(_log, i) => i}>
                {(log) => <div>{log}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
