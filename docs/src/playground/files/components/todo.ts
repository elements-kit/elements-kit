import { reactive } from "elements-kit/signals";

export class Todo {
  static #id = 0;
  id = Todo.#id++;
  text: string;
  @reactive() done = false;
  constructor(text: string) {
    this.text = text;
  }
}
