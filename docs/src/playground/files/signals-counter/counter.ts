import { signal, computed, effect, untracked, trigger } from "elements-kit/signals";

export const count = signal(0);
export const doubled = computed(() => count() * 2);
export const logs = signal<string[]>([]);

effect(() => {
  untracked(logs).push(`count: ${count()}, doubled: ${doubled()}`);
  trigger(logs);
});
