/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
// Compile-time probes: `<For each>` must infer the item type T for all
// accepted `each` shapes. The typed field accesses below fail `tsc --noEmit`
// if T degrades to unknown; the runtime assertions keep vitest happy.
import { describe, it, expect } from "vitest";
import { For } from "./for";
import { signal } from "./signals";

interface Todo {
  id: number;
  text: string;
}

describe("For — item type inference (compile-time)", () => {
  it("infers T from a signal each", () => {
    const todos = signal<Todo[]>([{ id: 1, text: "a" }]);
    const el = (
      <For each={todos} by={(t) => t.id}>
        {(t, i) => {
          const id: number = t.id;
          const index: number = i;
          void index;
          return <li data-id={id}>{t.text}</li>;
        }}
      </For>
    );
    expect(el).toBeTruthy();
  });

  it("infers T from a static array each", () => {
    const el = (
      <For each={[{ id: 2, text: "b" }]} by={(t) => t.id}>
        {(t) => {
          const text: string = t.text;
          return <li>{text}</li>;
        }}
      </For>
    );
    expect(el).toBeTruthy();
  });

  it("infers T from a plain thunk each", () => {
    const list: Todo[] = [{ id: 3, text: "c" }];
    const el = (
      <For each={() => list} by={(t) => t.id}>
        {(t) => {
          const text: string = t.text;
          return <li>{text}</li>;
        }}
      </For>
    );
    expect(el).toBeTruthy();
  });
});
