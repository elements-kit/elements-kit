import { For } from "elements-kit";
import { signal, computed, reactive } from "elements-kit/signals";
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";
import { mountSandpack } from "./sandpack";

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
    const Host = () => this;
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

class Todo {
  static id = 0;
  id: number = Todo.id++;
  text: string;

  @reactive()
  done: boolean;

  constructor(text: string, done: boolean) {
    this.text = text;
    this.done = done;
  }
}

class TodoState {
  @reactive()
  todos: Todo[] = [];

  addTodo(_text: string) {
    const text = _text.trim();
    if (!text) return;
    this.todos = [...this.todos, new Todo(text, false)];
  }
  removeTodo(id: number) {
    this.todos = this.todos.filter((t) => t.id !== id);
  }
}

// ─ Components ───────────────────────────────────────────────────────────────
class TodoApp extends TodoState {
  @reactive()
  showDone = true;

  newTodo = signal("");

  constructor() {
    super();
    this.todos = [
      new Todo("Learn elements-kit", true),
      new Todo("Build something fun with it", false),
    ];
  }

  addTodo() {
    const text = this.newTodo().trim();
    if (!text) return;
    super.addTodo(text);
    this.newTodo("");
  }

  visibleTodos = computed(() =>
    this.showDone ? this.todos : this.todos.filter((t) => !t.done),
  );

  render() {
    return (
      <section>
        <h2>Todo List</h2>

        {/* Add todo */}
        <form
          on:submit={(e: Event) => {
            e.preventDefault();
            this.addTodo();
          }}
        >
          <input
            type="text"
            placeholder="What needs to be done?"
            value={this.newTodo}
            on:input={(e: Event) =>
              this.newTodo((e.target as HTMLInputElement).value)
            }
          />
          <button type="submit">Add</button>
        </form>

        {/* Filter toggle */}
        <label style="display: block; margin: 8px 0">
          <input
            type="checkbox"
            checked={this.showDone}
            on:change={() => (this.showDone = !this.showDone)}
          />{" "}
          Show completed
        </label>

        {/* Todo list with keyed reconciliation */}
        <ul>
          <For<Todo> each={this.visibleTodos} by={(todo: Todo) => todo.id}>
            {(todo: Todo) => (
              <li
                style:text-decoration={computed(() =>
                  todo.done ? "line-through" : "none",
                )}
                style:opacity={computed(() => (todo.done ? "0.6" : "1"))}
              >
                <input
                  type="checkbox"
                  checked={computed(() => todo.done)}
                  on:change={() => (todo.done = !todo.done)}
                />{" "}
                {todo.text}{" "}
                <button onClick={() => this.removeTodo(todo.id)}>✕</button>
              </li>
            )}
          </For>
        </ul>

        {/* Conditional rendering  */}
        {() =>
          this.todos.length === 0 && (
            <p style="color: gray">
              <em>No todos yet — add one above!</em>
            </p>
          )
        }

        <p style="margin-top: 8px; font-size: 0.85em; color: #666">
          {() =>
            `${this.todos.filter((t) => t.done).length}/${this.todos.length} done`
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
const appRoot = document.getElementById("app")!;
appRoot.appendChild(new App().render());

const sandpackContainer = document.createElement("div");
appRoot.appendChild(sandpackContainer);
mountSandpack(sandpackContainer);
