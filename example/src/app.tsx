import {
  signal,
  computed,
  effect,
  batch,
  onCleanup,
  effectScope,
  untracked,
  trigger,
  reactive,
} from "elements-kit/signals";
import { For } from "elements-kit/for";
import {
  attributes,
  ATTRIBUTES,
  type Attributes,
} from "elements-kit/attributes";
import { defineElement } from "elements-kit/custom-elements";
import type { MaybeReactiveProps, Props } from "elements-kit/jsx-runtime";

// ============ Demo 1: Counter ============
const count = signal(0);
const doubled = computed(() => count() * 2);
const logs = signal<string[]>([]);

effect(() => {
  untracked(logs).push(`count: ${count()}, doubled: ${doubled()}`);
  trigger(logs);
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

// ============ Demo 5: Untracked ============
const count2 = signal(0);
const secret = signal("hidden");
const untrackedLogs = signal<string[]>([]);

effect(() => {
  untracked(untrackedLogs).push(`count: ${count2()} (tracked)`);
  untracked(untrackedLogs).push(`secret: ${untracked(secret)} (untracked) `);
  trigger(untrackedLogs);
});

// ============ App with Tabs ============
let activeTab = signal(0);

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 800px;">
        <h2 style="margin-top: 0;">Signals Playground</h2>

        <div style="display: flex; gap: 4px; margin-bottom: 1rem; flex-wrap: wrap;">
          <For
            each={[
              "Counter",
              "Batch",
              "onCleanup",
              "effectScope",
              "untracked",
              "Props",
            ]}
            by={(_log, i) => i}
          >
            {(name, i) => (
              <button
                on:click={() => activeTab(i)}
                style:background={computed(() =>
                  activeTab() === i ? "#3b82f6" : "#e5e7eb",
                )}
                style:color={computed(() =>
                  activeTab() === i ? "white" : "black",
                )}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: "4px",
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
        {() => activeTab() === 5 && <DemoProps />}
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
        <button on:click={() => count(count() + 1)}>+1</button>
        <button on:click={() => count(count() - 1)}>−1</button>
        <button on:click={() => count(0)}>Reset</button>
      </div>
      <div style="margin-top: 1rem;">
        <strong>Effect logs:</strong>
        <div
          style={{
            background: "#f9fafb",
            padding: "0.5rem",
            borderRadius: "4px",
            maxHeight: "100px",
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: "0.85em",
          }}
        >
          <For each={logs} by={(log, i) => i}>
            {(log) => <div>{log}</div>}
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
        <button on:click={() => x(x() + 1)}>x +1</button>
        <button on:click={() => y(y() + 1)}>y +1</button>
        <button
          on:click={() =>
            batch(() => {
              x(x() + 10);
              y(y() + 10);
            })
          }
        >
          Batch (x+10, y+10)
        </button>
        <button
          on:click={() => {
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
            borderRadius: "4px",
            maxHeight: "100px",
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
  );
}

function DemoCleanup() {
  return (
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
      <h3 style="margin-top: 0;">onCleanup (fetch with abort)</h3>
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
            background: "#f9fafb",
            padding: "0.5rem",
            borderRadius: "4px",
            maxHeight: "100px",
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: "0.85em",
          }}
        >
          <For each={fetchLogs} by={(log, i) => i}>
            {(log) => <div>{log}</div>}
          </For>
        </div>
      </div>
    </div>
  );
}

const scopeLogs = signal<string[]>([]);
const user = signal("Alice");
const theme = signal("light");

function DemoEffectScope() {
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
  return (
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
      <h3 style="margin-top: 0;">effectScope (grouped effects)</h3>
      <p>
        user: <strong>{() => user()}</strong>
        {" — "}
        theme: <strong>{() => theme()}</strong>
      </p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button on:click={() => user(user() === "Alice" ? "Bob" : "Alice")}>
          Toggle user
        </button>
        <button on:click={() => theme(theme() === "light" ? "dark" : "light")}>
          Toggle theme
        </button>
        <button on:click={() => stop()}>Stop all effects</button>
        <button on:click={() => scopeLogs([])}>Clear logs</button>
      </div>
      <div style="margin-top: 1rem;">
        <strong>Scope logs (stop = silence):</strong>
        <div
          style={{
            background: "#f9fafb",
            padding: "0.5rem",
            borderRadius: "4px",
            maxHeight: "100px",
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: "0.85em",
          }}
        >
          <For each={scopeLogs} by={(log, i) => i}>
            {(log) => <div>{log}</div>}
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
        <button on:click={() => count2(count2() + 1)}>
          count +1 (tracked)
        </button>
        <button
          on:click={() => secret(secret() === "hidden" ? "visible" : "hidden")}
        >
          Toggle secret
        </button>
        <button on:click={() => untrackedLogs([])}>Clear logs</button>
      </div>
      <div style="margin-top: 1rem;">
        <strong>Logs (secret changes don't trigger re-run):</strong>
        <div
          style={{
            background: "#f9fafb",
            padding: "0.5rem",
            borderRadius: "4px",
            maxHeight: "100px",
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: "0.85em",
          }}
        >
          <For each={untrackedLogs} by={(log, i) => i}>
            {(log) => <div>{log}</div>}
          </For>
        </div>
      </div>
    </div>
  );
}

// ============ Demo 6: Props Matrix (fn / class / custom-element) ============

const propsName = signal("Wael");
const propsExcited = signal(false);
const propsNameUpper = computed(() => propsName().toUpperCase());

// — Function component — props auto-wrapped into per-key getters
function FnGreeting(props: Props<{ name: string; excited?: boolean }>) {
  return (
    <p style="margin: 0;">
      <code>[fn]</code> Hello {() => props.name()}
      {() => (props.excited?.() ? "!" : ".")}
    </p>
  );
}

// — Class component — constructor-typed props, applyProps assigns each key
class ClassGreeting {
  constructor(
    _props?: MaybeReactiveProps<{ name?: string; excited?: boolean }>,
  ) {}
  @reactive() name: string = "world";
  @reactive() excited: boolean = false;
  render(): Element {
    return (
      <p style="margin: 0;">
        <code>[class]</code> Hello {() => this.name}
        {() => (this.excited ? "!" : ".")}
      </p>
    ) as Element;
  }
}

// — Custom element — @attributes + @reactive fields, registered globally
@attributes
class CeGreeting extends HTMLElement {
  @reactive() name: string = "world";
  @reactive() excited: boolean = false;
  static [ATTRIBUTES]: Attributes<CeGreeting> = {
    name(v) {
      this.name = v ?? "world";
    },
    excited(v) {
      this.excited = v != null;
    },
  };
  connectedCallback() {
    const root = this.attachShadow({ mode: "open" });
    root.appendChild(
      (
        <p style="margin: 0;">
          <code>[ce]</code> Hello {() => this.name}
          {() => (this.excited ? "!" : ".")}
        </p>
      ) as Element,
    );
  }
}
defineElement("ce-greeting", CeGreeting);
declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {
      "ce-greeting": typeof CeGreeting;
    }
  }
}

function Row(props: { label: string; children?: unknown }) {
  return (
    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center; padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">
      <strong style="font-size: 0.85em; color: #6b7280;">{props.label}</strong>
      <div>{props.children as any}</div>
    </div>
  );
}

function DemoProps() {
  return (
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
      <h3 style="margin-top: 0;">Props matrix — fn / class / custom-element</h3>
      <p style="font-size: 0.85em; color: #6b7280;">
        Same prop combinations across three component shapes. Mutate the signals
        below — every reactive variant updates; the static one stays put.
      </p>

      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1rem;">
        <button
          on:click={() => propsName(propsName() === "Wael" ? "Sam" : "Wael")}
        >
          Toggle name
        </button>
        <button on:click={() => propsExcited(!propsExcited())}>
          Toggle excited
        </button>
      </div>

      <h4 style="margin: 0 0 4px;">Function component</h4>
      <div style="background: #f9fafb; padding: 8px; border-radius: 4px; margin-bottom: 12px;">
        <Row label="static">
          <FnGreeting name="static-fn" />
        </Row>
        <Row label="signal">
          <FnGreeting name={propsName} />
        </Row>
        <Row label="computed + bool">
          <FnGreeting name={propsNameUpper} excited />
        </Row>
        <Row label="signal + signal">
          <FnGreeting name={propsName} excited={propsExcited} />
        </Row>
      </div>

      <h4 style="margin: 0 0 4px;">Class component</h4>
      <div style="background: #f9fafb; padding: 8px; border-radius: 4px; margin-bottom: 12px;">
        <Row label="static">
          <ClassGreeting name="static-class" />
        </Row>
        <Row label="signal">
          <ClassGreeting name={propsName} />
        </Row>
        <Row label="computed + bool">
          <ClassGreeting name={propsNameUpper} excited={true} />
        </Row>
        <Row label="signal + signal">
          <ClassGreeting name={propsName} excited={propsExcited} />
        </Row>
      </div>

      <h4 style="margin: 0 0 4px;">Custom element (attribute-bound)</h4>
      <div style="background: #f9fafb; padding: 8px; border-radius: 4px;">
        <Row label="static attr">
          <ce-greeting name="static-ce" />
        </Row>
        <Row label="signal attr">
          <ce-greeting name={propsName} />
        </Row>
        <Row label="computed attr">
          <ce-greeting name={propsNameUpper} excited={propsExcited} />
        </Row>
      </div>
    </div>
  );
}
