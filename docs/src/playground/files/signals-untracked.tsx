import { signal, effect, untracked, trigger } from "elements-kit/signals";
import { For } from "elements-kit/for";

const count2 = signal(0);
const secret = signal("hidden");
const untrackedLogs = signal<string[]>([]);

effect(() => {
  untracked(untrackedLogs).push(`count: ${count2()} (tracked)`);
  untracked(untrackedLogs).push(`secret: ${untracked(secret)} (untracked)`);
  trigger(untrackedLogs);
});

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">untracked — read without subscribing</h2>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
          <p>
            count: <strong>{() => count2()}</strong>
            {" — "}
            secret: <strong>{() => secret()}</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onClick={() => count2(count2() + 1)}>
              count +1 (tracked)
            </button>
            <button
              onClick={() =>
                secret(secret() === "hidden" ? "visible" : "hidden")
              }
            >
              Toggle secret
            </button>
            <button onClick={() => untrackedLogs([])}>Clear logs</button>
          </div>
          <div style="margin-top: 1rem;">
            <strong>Logs (secret changes don't trigger re-run):</strong>
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
              <For each={untrackedLogs} by={(_log: string, i: number) => i}>
                {(log: string) => <div>{log}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    ) as Element;
  }
}
