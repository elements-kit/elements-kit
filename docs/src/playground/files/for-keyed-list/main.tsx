import { For } from "elements-kit/for";
import { rows, add, removeLast, shuffle } from "./rows";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">For — keyed list rendering</h2>
        <div style="display: flex; gap: 8px; margin-bottom: 1rem;">
          <button on:click={add}>add</button>
          <button on:click={removeLast}>remove last</button>
          <button on:click={shuffle}>shuffle</button>
        </div>
        <ul style="border: 1px solid #8884; border-radius: 8px; padding: 1rem; list-style: none; margin: 0;">
          <For each={rows} by={(row) => row.id}>
            {(row) => (
              <li style="padding: 4px 0;">
                #{row.id} — {row.label}
              </li>
            )}
          </For>
        </ul>
      </div>
    );
  }
}
