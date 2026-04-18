import { reactive, computed } from "elements-kit/signals";
import { For } from "elements-kit/for";

// ── Store ─────────────────────────────────────────────────────────────────────
class Todo {
  static #id = 0;
  id = Todo.#id++;
  text: string;
  @reactive() done = false;
  constructor(text: string) {
    this.text = text;
  }
}

class TodoStore {
  @reactive() todos: Todo[] = [
    new Todo("Read the docs"),
    new Todo("Build something"),
    new Todo("Ship it"),
  ];
  @reactive() filter: "all" | "active" | "done" = "all";

  visible = computed(() =>
    this.todos.filter((t) =>
      this.filter === "all" ? true : this.filter === "done" ? t.done : !t.done,
    ),
  );

  add(text: string) {
    const t = text.trim();
    if (t) this.todos = [...this.todos, new Todo(t)];
  }
  remove(id: number) {
    this.todos = this.todos.filter((t) => t.id !== id);
  }
}

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
              onClick={() => (this.filter = f)}
            >
              {f}
            </button>
          ))}
        </div>

        <ul style="padding: 0; list-style: none">
          <For each={this.visible} by={(t: Todo) => t.id}>
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
                <button onClick={() => this.remove(todo.id)}>✕</button>
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
