/** @jsxImportSource elements-kit */
import { signal } from "elements-kit/signals";
import { For } from "elements-kit/for";

interface Item {
  id: number;
  label: string;
}

/**
 * `<For>` island demo: the list is server-rendered; hydration adopts every
 * row (node identity preserved), and later updates reconcile in place —
 * reorder moves the existing DOM nodes, add mounts only the new row.
 */
export default function AstroList() {
  let nextId = 4;
  const items = signal<Item[]>([
    { id: 1, label: "alpha" },
    { id: 2, label: "beta" },
    { id: 3, label: "gamma" },
  ]);

  return (
    <div style="padding:0.75rem 1rem;border:1px solid var(--sl-color-gray-5);border-radius:0.5rem">
      <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem">
        <button
          style="cursor:pointer"
          on:click={() => items([...items()].reverse())}
        >
          reverse
        </button>
        <button
          style="cursor:pointer"
          on:click={() =>
            items([...items(), { id: nextId, label: `item ${nextId++}` }])
          }
        >
          add
        </button>
        <button
          style="cursor:pointer"
          on:click={() => items(items().slice(0, -1))}
        >
          remove
        </button>
      </div>
      <ul style="margin:0">
        <For each={items} by={(item) => item.id}>
          {(item) => <li>{item.label}</li>}
        </For>
      </ul>
    </div>
  );
}
