import { signal, effect, effectScope, untracked } from "elements-kit/signals";

export const scopeLogs = signal<string[]>([]);
export const user = signal("Alice");
export const theme = signal("light");

export const stop: () => void = effectScope(() => {
  effect(() => {
    const logs = untracked(scopeLogs);
    scopeLogs(logs.concat(`user: ${user()}`));
  });
  effect(() => {
    const logs = untracked(scopeLogs);
    scopeLogs(logs.concat(`theme: ${theme()}`));
  });
});
