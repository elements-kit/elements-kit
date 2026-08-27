import { computed, signal, onCleanup } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";
import { createDebounced } from "elements-kit/utilities/debounced";
import { For } from "elements-kit/for";

const FRUITS = [
  "apple", "apricot", "avocado", "banana", "blackberry", "blueberry",
  "cherry", "coconut", "cranberry", "date", "fig", "grape", "kiwi",
  "lemon", "lime", "mango", "melon", "nectarine", "orange", "papaya",
  "peach", "pear", "pineapple", "plum", "pomegranate", "raspberry",
  "strawberry", "tangerine", "watermelon",
];

const fakeFetch = (q: string, signal: AbortSignal) =>
  new Promise<string[]>((resolve, reject) => {
    const id = setTimeout(() => {
      resolve(FRUITS.filter((f) => f.includes(q.toLowerCase())));
    }, 300);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("aborted", "AbortError"));
    });
  });

const query = signal("");
const debounced = createDebounced(query, 250);

const search = async(() => {
  const q = debounced();
  if (!q) return Promise.resolve([] as string[]);
  const ctrl = new AbortController();
  onCleanup(() => ctrl.abort());
  return fakeFetch(q, ctrl.signal);
}).start();

const results = computed<string[]>(() => search.value ?? []);

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">Debounced search</h2>
        <input
          type="text"
          placeholder="search fruits…"
          on:input={(e) => query((e.currentTarget as HTMLInputElement).value)}
          style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box;"
        />
        <p style="color: #6b7280; margin: 0.5rem 0;">
          state: <strong>{() => search.state}</strong> — typed:{" "}
          <code>{() => query() || "—"}</code> — debounced:{" "}
          <code>{() => debounced() || "—"}</code>
        </p>
        <ul style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; list-style: none; margin: 0; min-height: 80px;">
          <For each={results} by={(f) => f}>
            {(fruit) => <li style="padding: 2px 0;">{fruit}</li>}
          </For>
        </ul>
      </div>
    );
  }
}
