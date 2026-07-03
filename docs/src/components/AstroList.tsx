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
    <div class="x-card" style="padding:var(--space-3) var(--space-4)">
      <div style="display:flex;gap:var(--space-2);margin-block-end:var(--space-3)">
        <button
          class="unset x-button"
          data-variant="surface"
          data-size="1"
          on:click={() => items([...items()].reverse())}
        >
          reverse
        </button>
        <button
          class="unset x-button"
          data-variant="surface"
          data-size="1"
          on:click={() =>
            items([...items(), { id: nextId, label: `item ${nextId++}` }])
          }
        >
          add
        </button>
        <button
          class="unset x-button"
          data-variant="surface"
          data-size="1"
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
