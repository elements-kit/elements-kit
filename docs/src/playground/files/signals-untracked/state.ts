import { signal, effect, untracked, trigger } from "elements-kit/signals";

export const count2 = signal(0);
export const secret = signal("hidden");
export const untrackedLogs = signal<string[]>([]);

effect(() => {
  untracked(untrackedLogs).push(`count: ${count2()} (tracked)`);
  untracked(untrackedLogs).push(`secret: ${untracked(secret)} (untracked)`);
  trigger(untrackedLogs);
});
