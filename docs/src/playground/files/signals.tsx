import {
  signal,
  computed,
  effect,
  batch,
  onCleanup,
  effectScope,
  untracked,
  trigger,
} from "elements-kit/signals";
import { For } from "elements-kit";

// ============ Demo 1: Counter ============
const count = signal(0);
const doubled = computed(() => count() * 2);
const logs: string[] = [];

effect(() => {
  logs.push(`count: ${count()}, doubled: ${doubled()}`);
});

// ============ Demo 2: Batch ============
const x = signal(1);
const y = signal(2);
const batchLogs = signal<string[]>([]);
effect(() => {
  untracked(batchLogs).push(`x: ${x()}, y: ${y()}`);
  trigger(batchLogs);
});

// ============ Demo 3: Cleanup (simulated) ============
const url = signal("/api/data");
const fetchLogs: string[] = [];
let abortCount = 0;

effect(() => {
  const currentUrl = url();
  fetchLogs.push(`Fetching: ${currentUrl}`);

  onCleanup(() => {
    abortCount++;
    fetchLogs.push(`Aborted previous request`);
  });
});

// ============ Demo 5: Untracked ============
const count2 = signal(0);
const secret = signal("hidden");
const untrackedLogs = signal<string[]>([]);

effect(() => {
  untracked(untrackedLogs).push(`count: ${count2()} (tracked)`);
  untracked(untrackedLogs).push(
    `secret: ${untracked(() => secret())} (untracked)`,
  );
});

// ============ App with Tabs ============
let activeTab = signal(0);

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">Signals Playground</h2>

        <div style="display: flex; gap: 4px; margin-bottom: 1rem; flex-wrap: wrap;">
          <For<string>
            each={["Counter", "Batch", "onCleanup", "effectScope", "untracked"]}
            by={(log: string) => log}
          >
            {(name: string, i: number) => (
              <button
                onClick={() => activeTab(i)}
                style:background={computed(() =>
                  activeTab() === i ? "#3b82f6" : "#e5e7eb",
                )}
                style:color={computed(() =>
                  activeTab() === i ? "white" : "black",
                )}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  "border-radius": "4px",
                  cursor: "pointer",
                }}
              >
                {name}
              </button>
            )}
          </For>
        </div>

        {() => activeTab() === 0 && <DemoCounter />}
        {() => activeTab() === 1 && <DemoBatch />}
        {() => activeTab() === 2 && <DemoCleanup />}
        {() => activeTab() === 3 && <DemoEffectScope />}
        {() => activeTab() === 4 && <DemoUntracked />}
        <p style="font-size: 0.8em; color: #666; margin-top: 2rem;">
          Open the console to see effect logs.
        </p>
      </div>
    ) as Element;
  }
}

function DemoCounter() {
  return (
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
      <h3 style="margin-top: 0;">Counter (signal + computed + effect)</h3>
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
            "max-height": "100px",
            overflow: "auto",
            "font-family": "monospace",
            "font-size": "0.85em",
          }}
        >
          <For<string> each={logs} by={(log: string, i: number) => i}>
            {(log: string) => <div>{log}</div>}
          </For>
        </div>
      </div>
    </div>
  );
}

function DemoBatch() {
  return (
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
      <h3 style="margin-top: 0;">
        Batch (multiple writes → single notification)
      </h3>
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
        <button
          onClick={() => {
            batchLogs([]);
          }}
        >
          Clear logs
        </button>
      </div>
      <div style="margin-top: 1rem;">
        <strong>Effect logs (note: batch = 1 log, separate = 2 logs):</strong>
        <div
          style={{
            background: "#f9fafb",
            padding: "0.5rem",
            "border-radius": "4px",
            "max-height": "100px",
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
  );
}

function DemoCleanup() {
  return (
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
      <h3 style="margin-top: 0;">onCleanup (fetch with abort)</h3>
      <p>
        URL: <strong>{() => url()}</strong>
        {" — "}
        Abort count: <strong>{() => abortCount}</strong>
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
            "max-height": "100px",
            overflow: "auto",
            "font-family": "monospace",
            "font-size": "0.85em",
          }}
        >
          <For each={fetchLogs} by={(log: string) => log}>
            {(log: string) => <div>{log}</div>}
          </For>
        </div>
      </div>
    </div>
  );
}

const scopeLogs = signal<string[]>([]);
const user = signal("Alice");
const theme = signal("light");

const stop: () => void = effectScope(() => {
  effect(() => untracked(scopeLogs).push(`user: ${user()}`));
  effect(() => untracked(scopeLogs).push(`theme: ${theme()}`));
});
function DemoEffectScope() {
  return (
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
      <h3 style="margin-top: 0;">effectScope (grouped effects)</h3>
      <p>
        user: <strong>{() => user()}</strong>
        {" — "}
        theme: <strong>{() => theme()}</strong>
      </p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button onClick={() => user(user() === "Alice" ? "Bob" : "Alice")}>
          Toggle user
        </button>
        <button onClick={() => theme(theme() === "light" ? "dark" : "light")}>
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
            "max-height": "100px",
            overflow: "auto",
            "font-family": "monospace",
            "font-size": "0.85em",
          }}
        >
          <For each={scopeLogs} by={(log: string) => log}>
            {(log: string) => <div>{log}</div>}
          </For>
        </div>
      </div>
    </div>
  );
}

function DemoUntracked() {
  return (
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
      <h3 style="margin-top: 0;">untracked (read without subscribing)</h3>
      <p>
        count: <strong>{() => count2()}</strong>
        {" — "}
        secret: <strong>{() => secret()}</strong>
      </p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button onClick={() => count2(count2() + 1)}>count +1 (tracked)</button>
        <button
          onClick={() => secret(secret() === "hidden" ? "visible" : "hidden")}
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
            "max-height": "100px",
            overflow: "auto",
            "font-family": "monospace",
            "font-size": "0.85em",
          }}
        >
          <For each={untrackedLogs} by={(log: string) => log}>
            {(log: string) => <div>{log}</div>}
          </For>
        </div>
      </div>
    </div>
  );
}
