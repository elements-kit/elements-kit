import { signal, effect, onCleanup, untracked, trigger } from "elements-kit/signals";

export const url = signal("/api/data");
export const fetchLogs = signal<string[]>([]);
export const abortCount = signal(0);

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
