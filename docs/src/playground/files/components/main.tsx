import { computed } from "elements-kit/signals";
import { For } from "elements-kit/for";
import type { Todo } from "./todo";
import { TodoStore } from "./todo-store";

// ── Component ─────────────────────────────────────────────────────────────────
export class App extends TodoStore {
  render() {
    return (
      <section style="padding: 1.5rem; font-family: sans-serif; max-width: 480px">
        <h2>Todo</h2>

        <form
          on:submit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem(
              "value",
            ) as HTMLInputElement;
            this.add(input.value);
            e.currentTarget.reset();
          }}
        >
          <input name="value" placeholder="New todo…" />
          <button type="submit">Add</button>
        </form>

        <div style="margin: 8px 0">
          {(["all", "active", "done"] as const).map((f) => (
            <button
              style:font-weight={computed(() =>
                this.filter === f ? "bold" : "normal",
              )}
              on:click={() => (this.filter = f)}
            >
              {f}
            </button>
          ))}
        </div>

        <ul style="padding: 0; list-style: none">
          <For each={this.visible} by={(t) => t.id}>
            {(todo: Todo) => (
              <li style="display: flex; gap: 8px; align-items: center; padding: 4px 0">
                <input
                  type="checkbox"
                  checked={computed(() => todo.done)}
                  on:change={() => (todo.done = !todo.done)}
                />
                <span
                  style:text-decoration={computed(() =>
                    todo.done ? "line-through" : "none",
                  )}
                >
                  {todo.text}
                </span>
                <button on:click={() => this.remove(todo.id)}>✕</button>
              </li>
            )}
          </For>
        </ul>

        <p style="font-size: 0.8em; color: #888">
          {() => this.todos.filter((t) => !t.done).length} remaining
        </p>
      </section>
    );
  }
}
