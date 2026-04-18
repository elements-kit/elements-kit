import { signal } from "elements-kit/signals";
import { For } from "elements-kit";

type Row = { id: number; label: string };

let nextId = 4;
const rows = signal<Row[]>([
  { id: 1, label: "alpha" },
  { id: 2, label: "beta" },
  { id: 3, label: "gamma" },
]);

const add = () => {
  const id = nextId++;
  rows([...rows(), { id, label: `item ${id}` }]);
};
const removeLast = () => rows(rows().slice(0, -1));
const shuffle = () => rows([...rows()].sort(() => Math.random() - 0.5));

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">For — keyed list rendering</h2>
        <div style="display: flex; gap: 8px; margin-bottom: 1rem;">
          <button onClick={add}>add</button>
          <button onClick={removeLast}>remove last</button>
          <button onClick={shuffle}>shuffle</button>
        </div>
        <ul style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; list-style: none; margin: 0;">
          <For<Row> each={rows} by={(row) => row.id}>
            {(row) => (
              <li style="padding: 4px 0;">
                #{row.id} — {row.label}
              </li>
            )}
          </For>
        </ul>
      </div>
    ) as Element;
  }
}
