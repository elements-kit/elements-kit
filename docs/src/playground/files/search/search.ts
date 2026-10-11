import { computed, signal, onCleanup } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";
import { createDebounced } from "elements-kit/utilities/debounced";
import { fakeFetch } from "./api";

export const query = signal("");
export const debounced = createDebounced(query, 250);

export const search = async(() => {
  const q = debounced();
  if (!q) return Promise.resolve([] as string[]);
  const ctrl = new AbortController();
  onCleanup(() => ctrl.abort());
  return fakeFetch(q, ctrl.signal);
}).start();

export const results = computed<string[]>(() => search.value ?? []);
