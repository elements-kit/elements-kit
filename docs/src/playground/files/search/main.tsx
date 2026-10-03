import { For } from "elements-kit/for";
import { query, debounced, search, results } from "./search";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">Debounced search</h2>
        <input
          type="text"
          placeholder="search fruits…"
          on:input={(e) => query((e.currentTarget as HTMLInputElement).value)}
          style="width: 100%; padding: 8px; border: 1px solid #8884; border-radius: 6px; box-sizing: border-box;"
        />
        <p style="color: #888; margin: 0.5rem 0;">
          state: <strong>{() => search.state}</strong> — typed:{" "}
          <code>{() => query() || "—"}</code> — debounced:{" "}
          <code>{() => debounced() || "—"}</code>
        </p>
        <ul style="border: 1px solid #8884; border-radius: 8px; padding: 1rem; list-style: none; margin: 0; min-height: 80px;">
          <For each={results} by={(f) => f}>
            {(fruit) => <li style="padding: 2px 0;">{fruit}</li>}
          </For>
        </ul>
      </div>
    );
  }
}
