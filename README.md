# ElementsKit

**Universal reactive primitives for the web.** Signals, JSX, and custom elements that work anywhere — standalone, inside React, Vue, or any framework, or as the foundation of your own component model.

```tsx
import { signal, computed, reactive } from "elements-kit/signals";
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";

@attributes
class CounterElement extends HTMLElement {
  static [attr] = {
    count(this: CounterElement, value: string | null) {
      this.count = Number(value ?? 0);
    },
  };

  @reactive() count = 0;
  doubled = computed(() => this.count * 2);

  connectedCallback() {
    this.appendChild(
      <section>
        <p>Count: <strong>{() => this.count}</strong> — Doubled: <strong>{this.doubled}</strong></p>
        <button onClick={() => this.count++}>+1</button>{" "}
        <button onClick={() => this.count--}>−1</button>
      </section> as Element,
    );
  }
}

customElements.define("x-counter", CounterElement);
```

---

## Why ElementsKit

Modern UI frameworks solve reactivity and rendering together — you adopt the whole system or none of it. ElementsKit separates the two:

- **Signals** are the reactive core — fine-grained, framework-agnostic, composable with any rendering model.
- **JSX** compiles to real `document.createElement` calls — no virtual DOM, no runtime overhead.
- **Custom elements** are standard browser components — ElementsKit enhances them with signals and JSX without wrapping or abstracting the platform.

Use one piece, or all three. Integrate with React for complex UIs. Build web components that work anywhere HTML does.

---

## Installation

```sh
npm install elements-kit
```

Configure JSX in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "elements-kit"
  }
}
```

---

## Signals

Fine-grained reactive state. Signals track their dependencies automatically — only the exact computeds and effects that depend on a changed signal are re-evaluated.

```ts
import { signal, computed, effect, batch, untracked, onCleanup } from "elements-kit/signals";

const count = signal(0);
const doubled = computed(() => count() * 2);

const stop = effect(() => {
  console.log("count:", count()); // runs on every change
});

count(1);  // → count: 1
count(2);  // → count: 2
stop();    // unsubscribe

batch(() => { count(10); count(20); }); // single notification

const raw = untracked(() => count()); // read without subscribing

effect(() => {
  const id = setInterval(() => count(count() + 1), 1000);
  onCleanup(() => clearInterval(id)); // runs before re-run or on stop
});
```

### Store

A **store** is a class whose fields are made reactive with `@reactive`. It holds shared state — no `render()`, no DOM — and any subscriber updates automatically.

```ts
import { reactive, computed } from "elements-kit/signals";

export class CartStore {
  @reactive() items: { name: string; price: number }[] = [];
  @reactive() discount = 0;

  total = computed(() =>
    this.items.reduce((s, i) => s + i.price, 0) * (1 - this.discount),
  );

  add(item: { name: string; price: number }) {
    this.items = [...this.items, item];
  }
}

export const cart = new CartStore();
```

Stores are **framework-agnostic** — the same instance drives a custom element, a React component, and a plain effect in sync.

---

## JSX → DOM

JSX compiles directly to `document.createElement`. No virtual DOM, no diffing.

```tsx
// This:
const el = <button onClick={() => count(count() + 1)}>{count}</button>;

// Is equivalent to:
const el = document.createElement("button");
el.addEventListener("click", () => count(count() + 1));
// `count` signal creates a live text node — updates in place on change
```

Passing a signal or `() => T` as a child or prop creates a **live binding** — the DOM updates in place, never re-rendering the surrounding tree.

```tsx
const name = signal("Alice");

<p>Hello, {name}!</p>             // live text node
<input value={name} />             // live attribute
<div class:active={computed(() => name() !== "")} />  // reactive class
<span style:color={signal("red")} />  // reactive style
```

### Prop namespaces

| Syntax | Effect |
|--------|--------|
| `{signal}` / `{() => fn()}` | Live-bound reactive child |
| `onClick={fn}` | Event listener (camelCase → `onclick`) |
| `on:click={fn}` | Explicit event namespace |
| `class:active={bool}` | Reactive `classList.toggle` |
| `style:color={value}` | Reactive inline style property |
| `prop:foo={val}` | Force property assignment (skips `setAttribute`) |

---

## Class Components

Any class with a `render()` method returning an `Element` is a component. Components own their state and produce elements.

```tsx
import { reactive, computed } from "elements-kit/signals";

class Counter {
  @reactive() count = 0;
  doubled = computed(() => this.count * 2);

  render() {
    return (
      <section>
        <p>{() => this.count} × 2 = {this.doubled}</p>
        <button onClick={() => this.count++}>+1</button>
      </section>
    ) as Element;
  }
}

document.getElementById("app")!.appendChild(new Counter().render());
```

---

## Custom Elements

ElementsKit enhances native `HTMLElement` subclasses — start with the platform, add only what you need.

```ts
import { reactive, computed } from "elements-kit/signals";
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";

@attributes
class CounterElement extends HTMLElement {
  static [attr] = {
    count(this: CounterElement, value: string | null) {
      this.count = Number(value ?? 0);
    },
  };

  @reactive() count = 0;
  doubled = computed(() => this.count * 2);

  connectedCallback() {
    this.appendChild(
      <section>
        <p>{() => this.count} × 2 = {this.doubled}</p>
        <button onClick={() => this.count++}>+1</button>
      </section> as Element,
    );
  }
}

customElements.define("x-counter", CounterElement);
```

`<x-counter count="5" />` — attribute bound, reactive, works in any HTML context.

---

## React Integration

Connect signals and stores to React components via `useSyncExternalStore`:

```tsx
import { useSignal, useScope } from "elements-kit/signals/react";
import { cart } from "./cart-store";

function CartSummary() {
  // Reads a @reactive field — re-renders only when cart.items changes
  const items = useSignal(() => cart.items);
  const total = useSignal(cart.total); // Computed<T> works directly

  // Effects tied to this component's lifetime
  useScope(() => {
    effect(() => console.log("cart updated:", items));
  });

  return <p>{items.length} items — ${total.toFixed(2)}</p>;
}
```

The same `cart` store drives custom elements, React trees, and plain scripts — all in sync.

---

## Signal Helpers

Pre-built signal factories for common browser APIs:

```ts
import { createMediaSignal } from "elements-kit/signals/media";

const isDark = createMediaSignal("(prefers-color-scheme: dark)");
const isMobile = createMediaSignal("(max-width: 640px)");

effect(() => document.documentElement.classList.toggle("dark", isDark()));
```

---

## `For` — Keyed List Rendering

Reconciles a reactive array into the DOM. Each item renders once per key — no full re-renders on reorder, add, or remove.

```tsx
import { For } from "elements-kit";

<ul>
  <For each={todos} by={(todo) => todo.id}>
    {(todo) => (
      <li>
        <input type="checkbox" checked={computed(() => todo.done)} on:change={() => (todo.done = !todo.done)} />
        {todo.text}
      </li>
    )}
  </For>
</ul>
```

---

## `@reactive()` Decorator

Makes any class field reactive — reads subscribe, writes trigger updates.

```ts
import { reactive, computed } from "elements-kit/signals";

class TodoApp {
  @reactive() todos: Todo[] = [];
  @reactive() showDone = true;

  visible = computed(() =>
    this.showDone ? this.todos : this.todos.filter((t) => !t.done),
  );
}
```

---

## `@attributes` Decorator

Wires `observedAttributes` and `attributeChangedCallback` from a static map:

```ts
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";

@attributes
class MyElement extends HTMLElement {
  static [attr] = {
    value(this: MyElement, v: string | null) {
      this.value = v ?? "";
    },
  };

  @reactive() value = "";
}
```

---

## Roadmap

- [ ] More signal helpers (`localStorage`, `IntersectionObserver`, `ResizeObserver`, …)
- [ ] Context — share state across a subtree without prop drilling
- [ ] Async signal — `signal.from(promise)`, `signal.from(observable)`
- [ ] UI library — pre-built reactive components built on ElementsKit primitives
- [ ] More framework integrations (Vue, Solid, Angular, …)
- [ ] Tutorial — building a full app from scratch
- [ ] Complete TypeScript strict-mode coverage
