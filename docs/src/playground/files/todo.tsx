import { For } from "elements-kit";
import { signal, computed, reactive } from "elements-kit/signals";

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
export class App extends TodoState {
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
