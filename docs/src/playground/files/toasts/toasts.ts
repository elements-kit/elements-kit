import { signal, effectScope } from "elements-kit/signals";
import { createTimeout } from "elements-kit/utilities/timeout";

export type Toast = {
  id: number;
  message: string;
  tone: "info" | "success" | "warn";
  dispose: () => void;
};

export const toasts = signal<Toast[]>([]);
let nextId = 1;

export function dismiss(id: number) {
  const t = toasts().find((x) => x.id === id);
  t?.dispose();
  toasts(toasts().filter((x) => x.id !== id));
}

export function show(message: string, tone: Toast["tone"] = "info", ms = 3000) {
  const id = nextId++;
  const stop = effectScope(() => {
    createTimeout(() => dismiss(id), ms);
  });
  toasts([...toasts(), { id, message, tone, dispose: stop }]);
}
