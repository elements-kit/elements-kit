# ElementsKit

ElementsKit is a set of tools for building reactive web UI.

```tsx
import { signal, computed } from "elements-kit/signals";

class Counter {
  #count = signal(0);

  render() {
    return (
      <section>
        <p>Count: <strong>{this.#count}</strong></p>
        <button onClick={() => this.#count(this.#count() + 1)}>+1</button>
      </section>
    ) as Element;
  }
}

document.getElementById("app")!.appendChild(new Counter().render());
```

## Principles

- **Direct DOM Manipulation** — Works with native HTMLElements, no virtual DOM or diffing overhead
- **Fine-Grained Reactivity** — Only the exact DOM nodes that depend on a changed signal update
- **JSX Without a Framework** — Standard JSX syntax compiled to real DOM nodes, no plugin required
- **Decorator-Driven** — `@reactive()` turns any class field into a signal transparently
- **Web Component Ready** — First-class support for custom elements and `attributeChangedCallback`
- **Type-Safe** — Full TypeScript support with comprehensive type inference

---

## Signals

```ts
import { signal, computed, effect, batch, untracked } from "elements-kit/signals";

const count = signal(0);          // writable signal
const doubled = computed(() => count() * 2); // derived, read-only

effect(() => console.log(count())); // runs whenever count changes

count(count() + 1);               // write by calling with a value
console.log(count());             // read by calling with no arguments

batch(() => {                     // defer updates until the batch ends
  count(10);
  count(20);
});

const raw = untracked(() => count()); // read without subscribing
```

Signals are the reactive primitive. Passing a signal directly as a JSX child or prop creates a live binding — no wrapper needed:

```tsx
const name = signal("world");

// Both are equivalent live bindings:
<p>{name}</p>
<p>{() => name()}</p>
```

---

## JSX

Configure your `tsconfig.json` to use the built-in JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "elements-kit"
  }
}
```

### Props

| Syntax | Effect |
| --- | --- |
| `value={signal}` | Live-bound — updates DOM when signal changes |
| `value={42}` | Set once at render time |
| `onClick={fn}` | Camel-case event listener (`onclick`) |
| `on:click={fn}` | Explicit event namespace |
| `style:color={signal}` | Reactive inline style property |
| `class:active={signal}` | Reactive `classList.toggle` |
| `prop:foo={val}` | Force property assignment (bypasses `setAttribute`) |

```tsx
const active = signal(false);
const label = signal("Submit");

<button
  class:active={active}
  style:opacity={computed(() => active() ? "1" : "0.5")}
  onClick={() => (active(!active()))}
>
  {label}
</button>
```

### Children

Any of the following are valid children:

- Primitive values (`string`, `number`, …)
- `Node` / `Element`
- A signal or `computed` — re-renders in place when it changes
- A plain function `() => value` — re-evaluated reactively
- Arrays of the above

```tsx
const show = signal(true);

<div>
  <strong>Static text</strong>
  {count}                          // signal — live
  {() => count() * 2}             // thunk — live
  {() => show() && <span>Conditional</span>}
</div>
```

---

## `@reactive()` Decorator

Makes any class field behave like a signal — reads subscribe, writes trigger updates.

```ts
import { computed, reactive } from "elements-kit/signals";

class Todo {
  text: string;
  @reactive() done: boolean;
}

class TodoApp {
  @reactive()
  todos: Todo[] = [];

  @reactive()
  showDone = true;

  // Bind to an existing computed
  @reactive((self) => computed(() => self.todos.filter(t => !t.done)))
  readonly pending: Todo[] = [];
}
```

`@reactive()` without arguments auto-wraps the field's initial value in a `signal`. Pass a factory `(self) => signal | computed` to bind the field to an existing reactive value.

---

## `@attributes` Decorator

Automatically wires `observedAttributes` and `attributeChangedCallback` for custom elements from a static `[ATTRIBUTES]` map.

```ts
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";
import { signal, reactive } from "elements-kit/signals";

@attributes
class Counter extends HTMLElement {
  static [attr] = {
    count(this: Counter, value: string | null) {
      this.count = Number(value);  // calls the @reactive setter
    },
  };

  #count = signal(0);

  @reactive((s) => s.#count)
  count: number = 0;

  connectedCallback() {
    const Host = this;
    <Host>
      <p>Count: <strong>{this.#count}</strong></p>
      <button onClick={() => this.count++}>+1</button>
    </Host>;
  }
}

customElements.define("x-counter", Counter);
```

Use `<x-counter count={signal(9)} />` to pass a reactive attribute from JSX.

---

## `For` — Keyed List Rendering

Efficiently reconciles a reactive array into the DOM. Each item is rendered once per unique key — no full re-renders on reorder, add, or remove.

```tsx
import { For } from "elements-kit";

const todos = computed(() => state.todos.filter(t => !t.done));

<ul>
  <For each={todos} by={(todo) => todo.id}>
    {(todo) => (
      <li
        style:text-decoration={computed(() => todo.done ? "line-through" : "none")}
      >
        <input
          type="checkbox"
          checked={computed(() => todo.done)}
          on:change={() => (todo.done = !todo.done)}
        />{" "}
        {todo.text}
      </li>
    )}
  </For>
</ul>
```

| Prop | Type | Description |
| --- | --- | --- |
| `each` | `T[] \| (() => T[])` | Reactive array to render |
| `by` | `(item: T, index: number) => string \| number` | Key function — defaults to index |
| `children` | `(item: T, index: number) => Element` | Render function, called once per new key |

---

## Class Components

Any class with a `render()` method returning an `Element` or `DocumentFragment` works as a component. JSX instantiates it automatically:

```tsx
class App {
  render() {
    return (
      <div style="max-width: 480px; margin: 40px auto">
        <h1>My App</h1>
        <x-counter count={signal(0)} />
        <TodoApp />
      </div>
    ) as Element;
  }
}

document.getElementById("app")!.appendChild(new App().render());
```

---

## TO-DO

- [ ] Complete type safety
- [ ] Async signal
- [ ] URLPattern signal
- [ ] Context
- [ ] `Key` component (conditional key-gated subtrees)
