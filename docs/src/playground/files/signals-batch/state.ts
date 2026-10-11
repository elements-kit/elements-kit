import { signal, effect, batch, untracked, trigger } from "elements-kit/signals";

export const x = signal(1);
export const y = signal(2);
export const batchLogs = signal<string[]>([]);

effect(() => {
  untracked(batchLogs).push(`x: ${x()}, y: ${y()}`);
  trigger(batchLogs);
});

// Both writes land before the effect re-runs: one log, not two.
export function addTenToBoth() {
  batch(() => {
    x(x() + 10);
    y(y() + 10);
  });
}
