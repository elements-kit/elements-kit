import { signal, computed } from "elements-kit/signals";
import { reactive } from "elements-kit/decorators";
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";
import { For } from "elements-kit/jsx-runtime";

// ─ Counter (class component / custom element) ──────────────────────────────

@attributes
class Counter extends HTMLElement {
  static [attr] = {
    count(this: Counter, value: string | null) {
      this.count = Number(value);
    },
  };

  #count = signal(0);
  @reactive((s) => s.#count)
  count: number = 0;

  @reactive((s) => computed(() => s.#count() * 2))
  readonly doubled: number = 0;

  connectedCallback() {
    const Host = this;
    <Host>
      <section style="margin-bottom: 24px">
        <h2>Counter</h2>
        <p>
          Count: <strong>{this.#count}</strong> — Doubled:{" "}
          <strong>{() => this.doubled}</strong>
        </p>
        <button onClick={() => this.count++}>+1</button>{" "}
        <button onClick={() => this.count--}>−1</button>{" "}
        <button onClick={() => (this.count = 0)}>Reset</button>
      </section>
    </Host>;
  }
}
customElements.define("x-counter", Counter);

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "x-counter": Counter;
    }
  }
}

// ─ Signals ──────────────────────────────────────────────────────────────────

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

let nextId = 3;
const todos = signal<Todo[]>([
  { id: 1, text: "Learn elements-kit", done: true },
  { id: 2, text: "Build something cool", done: false },
]);

const newTodo = signal("");
const showDone = signal(true);

const visibleTodos = computed(() =>
  showDone() ? todos() : todos().filter((t) => !t.done),
);

// ─ Actions ──────────────────────────────────────────────────────────────────
function addTodo() {
  const text = newTodo().trim();
  if (!text) return;
  todos([...todos(), { id: nextId++, text, done: false }]);
  newTodo("");
}

function toggleTodo(id: number) {
  todos(todos().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
}

function removeTodo(id: number) {
  todos(todos().filter((t) => t.id !== id));
}

// ─ Components ───────────────────────────────────────────────────────────────
class TodoApp {
  render() {
    return (
      <section>
        <h2>Todo List</h2>

        {/* Add todo */}
        <form
          on:submit={(e: Event) => {
            e.preventDefault();
            addTodo();
          }}
        >
          <input
            type="text"
            placeholder="What needs to be done?"
            prop:value={newTodo}
            on:input={(e: Event) =>
              newTodo((e.target as HTMLInputElement).value)
            }
          />
          <button type="submit">Add</button>
        </form>

        {/* Filter toggle */}
        <label style="display: block; margin: 8px 0">
          <input
            type="checkbox"
            prop:checked={showDone}
            on:change={() => showDone(!showDone())}
          />{" "}
          Show completed
        </label>

        {/* Todo list with keyed reconciliation */}
        <ul>
          <For each={visibleTodos} by={(todo) => todo.id}>
            {(todo) => (
              <li
                style:text-decoration={todo.done ? "line-through" : "none"}
                style:opacity={todo.done ? "0.6" : "1"}
              >
                <input
                  type="checkbox"
                  prop:checked={computed(() => todo.done)}
                  on:change={() => toggleTodo(todo.id)}
                />{" "}
                {todo.text}{" "}
                <button onClick={() => removeTodo(todo.id)}>✕</button>
              </li>
            )}
          </For>
        </ul>

        {/* Conditional rendering  */}
        {() =>
          todos().length === 0 && (
            <p style="color: gray">
              <em>No todos yet — add one above!</em>
            </p>
          )
        }

        <p style="margin-top: 8px; font-size: 0.85em; color: #666">
          {() =>
            `${todos().filter((t) => t.done).length}/${todos().length} done`
          }
        </p>
      </section>
    ) as Element;
  }
}

class App {
  render() {
    return (
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 16px">
        <h1>elements-kit JSX Demo</h1>
        <x-counter count={signal(9)} />
        <TodoApp />
      </div>
    ) as Element;
  }
}

// ─ Mount ─────────────────────────────────────────────────────────────────────
document.getElementById("app")!.appendChild(new App().render());
