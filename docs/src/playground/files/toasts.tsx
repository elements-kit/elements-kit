import { signal, effectScope } from "elements-kit/signals";
import { createTimeout } from "elements-kit/utilities/timeout";
import { For } from "elements-kit/for";

type Toast = {
  id: number;
  message: string;
  tone: "info" | "success" | "warn";
  dispose: () => void;
};

const toasts = signal<Toast[]>([]);
let nextId = 1;

function dismiss(id: number) {
  const t = toasts().find((x) => x.id === id);
  t?.dispose();
  toasts(toasts().filter((x) => x.id !== id));
}

function show(message: string, tone: Toast["tone"] = "info", ms = 3000) {
  const id = nextId++;
  const stop = effectScope(() => {
    createTimeout(() => dismiss(id), ms);
  });
  toasts([...toasts(), { id, message, tone, dispose: stop }]);
}

const TONE: Record<Toast["tone"], string> = {
  info: "#1e3a8a",
  success: "#166534",
  warn: "#92400e",
};

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px; position: relative; min-height: 320px;">
        <h2 style="margin-top: 0;">Toast queue</h2>
        <p style="color: #6b7280; margin: 0 0 1rem;">
          Each toast owns an <code>effectScope</code>. Closing it disposes
          the scope, which cancels the timer.
        </p>
        <div style="display: flex; gap: 8px;">
          <button on:click={() => show("Saved.", "success")}>success</button>
          <button on:click={() => show("Heads up.", "info")}>info</button>
          <button on:click={() => show("Quota exceeded.", "warn", 5000)}>
            warn (5s)
          </button>
        </div>
        <div style="position: absolute; top: 1.5rem; right: 1.5rem; display: flex; flex-direction: column; gap: 8px; width: 240px;">
          <For each={toasts} by={(t) => t.id}>
            {(t) => (
              <div
                style={`background: ${TONE[t.tone]}; color: white; padding: 10px 12px; border-radius: 6px; display: flex; gap: 8px; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15);`}
              >
                <span style="flex: 1;">{t.message}</span>
                <button
                  on:click={() => dismiss(t.id)}
                  style="background: transparent; color: white; border: 0; cursor: pointer; font-size: 16px; line-height: 1;"
                  aria-label="dismiss"
                >
                  ✕
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
    );
  }
}
