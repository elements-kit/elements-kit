import { reactive, computed } from "elements-kit/signals";
import { Todo } from "./todo";

export class TodoStore {
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
