import { signal, computed } from "elements-kit/signals";
import { reactive } from "elements-kit/decorators";
import { Map, If } from "elements-kit/jsx-runtime";
import { attributes, ATTRIBUTES } from "elements-kit/attributes";

// ─ Counter (class component / custom element) ──────────────────────────────

@attributes
class CounterElement extends HTMLElement {
  Host = () => this;
  static [ATTRIBUTES] = {
    count(value: string) {
      this.count = Number(value);
    },
  };

  #count = signal(0);
  @reactive((s) => s.#count) count: number;
  @reactive((s) => computed(() => s.#count() * 2))
  doubled: number;

  connectedCallback() {
    <this.Host>
      <section style="margin-bottom: 24px">
        <h2>Counter</h2>
        <p>
          Count: <strong>{() => this.count}</strong> — Doubled:{" "}
          <strong>{() => this.doubled}</strong>
        </p>
        <button onClick={() => this.count++}>+1</button>{" "}
        <button onClick={() => this.count--}>−1</button>{" "}
        <button onClick={() => (this.count = 0)}>Reset</button>
      </section>
    </this.Host>;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "x-counter": { count?: number };
    }
  }
}
customElements.define("x-counter", CounterElement);

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
function TodoApp() {
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
          on:input={(e: Event) => newTodo((e.target as HTMLInputElement).value)}
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
        <Map each={visibleTodos} key={(t) => t.id}>
          {(todo, i) => (
            <li
              style:text-decoration={todo.done ? "line-through" : "none"}
              style:opacity={todo.done ? "0.6" : "1"}
            >
              <input
                type="checkbox"
                prop:checked={computed(() => todo.done)}
                on:change={() => toggleTodo(todo.id)}
              />{" "}
              {todo.text} <button onClick={() => removeTodo(todo.id)}>✕</button>
            </li>
          )}
        </Map>
      </ul>

      {/* Conditional rendering */}
      <If when={computed(() => todos().length === 0)}>
        <p style="color: gray">
          <em>No todos yet — add one above!</em>
        </p>
      </If>

      <p style="margin-top: 8px; font-size: 0.85em; color: #666">
        {() => `${todos().filter((t) => t.done).length}/${todos().length} done`}
      </p>
    </section>
  );
}

function App() {
  return (
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 16px">
      <h1>elements-kit JSX Demo</h1>
      <x-counter count={signal(9)} />
      <TodoApp />
    </div>
  );
}

// ─ Mount ─────────────────────────────────────────────────────────────────────
document.getElementById("app")!.appendChild(App()!);
