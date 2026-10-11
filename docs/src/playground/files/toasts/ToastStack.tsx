import { For } from "elements-kit/for";
import { toasts, dismiss, type Toast } from "./toasts";

const TONE: Record<Toast["tone"], string> = {
  info: "#1e3a8a",
  success: "#166534",
  warn: "#92400e",
};

export function ToastStack() {
  return (
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
  );
}
