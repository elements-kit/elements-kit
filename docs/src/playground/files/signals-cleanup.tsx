import {
  signal,
  effect,
  onCleanup,
  untracked,
  trigger,
} from "elements-kit/signals";
import { For } from "elements-kit/for";

const url = signal("/api/data");
const fetchLogs = signal<string[]>([]);
const abortCount = signal(0);

effect(() => {
  const currentUrl = url();
  untracked(fetchLogs).push(`Fetching: ${currentUrl}`);
  trigger(fetchLogs);
  onCleanup(() => {
    abortCount(abortCount() + 1);
    untracked(fetchLogs).push(`Aborted previous request`);
    trigger(fetchLogs);
  });
});

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">onCleanup — fetch with abort</h2>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
          <p>
            URL: <strong>{() => url()}</strong>
            {" — "}
            Abort count: <strong>{abortCount}</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onClick={() => url("/api/data")}>Fetch /api/data</button>
            <button onClick={() => url("/api/users")}>Fetch /api/users</button>
            <button onClick={() => url("/api/posts")}>Fetch /api/posts</button>
          </div>
          <div style="margin-top: 1rem;">
            <strong>Fetch logs:</strong>
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
              <For each={fetchLogs} by={(_log, i) => i}>
                {(log) => <div>{log}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    ) as Element;
  }
}
