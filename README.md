<p align="center">
  <img src="docs/public/og.svg" alt="ElementsKit" width="600" />
</p>

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
        <button on:click={() => this.count++}>+1</button>{" "}
        <button on:click={() => this.count--}>−1</button>
      </section> as Element,
    );
  }
}

customElements.define("x-counter", CounterElement);
```

---

## Packages

Every feature is a separate subpath export — import only what you use.

| Entry | Purpose |
|-------|---------|
| `elements-kit` | `For` component and core re-exports |
| `elements-kit/signals` | `signal`, `computed`, `effect`, `effectScope`, `batch`, `untracked`, `trigger`, `onCleanup`, `MaybeReactive`, `resolve`, `resolveProps`, `@reactive` |
| `elements-kit/render` | `render(target, setup)` — mount a node with a scoped lifetime; returns `unmount` |
| `elements-kit/attributes` | `@attributes` decorator + `ATTRIBUTES` symbol |
| `elements-kit/slot` | `Slot`, `Slots`, `SLOTS` symbol — comment-marker DOM regions |
| `elements-kit/custom-elements` | `defineElement`, `CustomElementRegistry` |
| `elements-kit/for` | `For` keyed-list component |
| `elements-kit/jsx-runtime` | JSX factory + type helpers (`ElementProps`, `Props`, `ComponentProps`, `MaybeReactiveProps`, `Require`) — configure via `jsxImportSource` |
| `elements-kit/integrations/react` | `useSignal`, `useScope` React bridge hooks |
| `elements-kit/utilities/*` | Reactive browser-API utilities — see [src/utilities/README.md](src/utilities/README.md) |

## Repository

- [src/](src/) — library source ([signals](src/signals/), [jsx-runtime](src/jsx-runtime/), [utilities](src/utilities/), [integrations](src/integrations/))
- [docs/](docs/) — Astro + Starlight documentation site
- [example/](example/) — Vite sandbox
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the library works (reactive model, JSX, custom elements, cleanup)
- [CONTRIBUTING.md](CONTRIBUTING.md) — quick start, quality bars, versioning, PR checklist
- [DOCS.md](DOCS.md) — doc-authoring rules
- [AGENTS.md](AGENTS.md) — agent navigation map
- [src/utilities/README.md](src/utilities/README.md) — utilities catalog and dependency graph

---

## Why ElementsKit

Modern UI frameworks solve reactivity and rendering together — you adopt the whole system or none of it. ElementsKit separates the two:

- **Signals** are the reactive core — fine-grained, framework-agnostic, composable with any rendering model.
- **JSX** compiles to real `document.createElement` calls — no virtual DOM, no runtime overhead.
- **Custom elements** are standard browser components — ElementsKit enhances them with signals and JSX without wrapping or abstracting the platform.

Use one piece, or all three. Integrate with React for complex UIs. Build web components that work anywhere HTML does.

### Primitives first, composable abstractions

Small primitives, one job each, typed interfaces at every boundary. Abstraction is assembled, not inherited — compose upward from `signal` → `sync(fromEvent(...), ...)` → `<For>` and stop at the level your feature needs. Designed for AI agents as much as for humans: each step is verifiable on its own, and there's no framework-specific mental model to learn before writing the first line.

- **No prop matrices.** No single-system components with forty flags where legal combinations aren't obvious until you read the source.
- **No hidden coupling.** Blocks meet at their types; invariants don't leak across layers.
- **Close to the platform.** `promise` wraps a native `Promise`. JSX compiles to `document.createElement`. Custom elements are `HTMLElement` subclasses. You already know the underlying shape.
- **Minimal surface.** `async` has no cache, no query client, no query/mutation split. If you need those, compose them on top — don't inherit them by default.
- **Swap, don't rewrite.** Replace one block (`throttled` → `debounced`) without touching the ones around it.

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
const el = <button on:click={() => count(count() + 1)}>{count}</button>;

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
| `on:click={fn}` | Event listener (case-preserving event name) |
| `class:active={bool}` | Reactive `classList.toggle` |
| `style:color={value}` | Reactive inline style property |
| `prop:foo={val}` | Force property assignment (skips `setAttribute`) |

---

## Class Components

Any class with a `render()` method returning an `Element` is a component. Components own their state and produce elements.

```tsx
import { reactive, computed } from "elements-kit/signals";
import { render } from "elements-kit/render";

class Counter {
  @reactive() count = 0;
  doubled = computed(() => this.count * 2);

  render() {
    return (
      <section>
        <p>{() => this.count} × 2 = {this.doubled}</p>
        <button on:click={() => this.count++}>+1</button>
      </section>
    ) as Element;
  }
}

const unmount = render(document.getElementById("app")!, () => <Counter/>);
```

---

## Custom Elements

ElementsKit enhances native `HTMLElement` subclasses — start with the platform, add only what you need.

```tsx
import { reactive, computed } from "elements-kit/signals";
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";
import { render } from "elements-kit/render";

@attributes
class CounterElement extends HTMLElement {
  static [attr] = {
    count(this: CounterElement, value: string | null) {
      this.count = Number(value ?? 0);
    },
  };

  @reactive() count = 0;
  doubled = computed(() => this.count * 2);

  #unmount?: () => void;

  connectedCallback() {
    this.#unmount = render(this, () => (
      <section>
        <p>{() => this.count} × 2 = {this.doubled}</p>
        <button on:click={() => this.count++}>+1</button>
      </section>
    ));
  }

  disconnectedCallback() {
    this.#unmount?.();
    this.#unmount = undefined;
  }
}

customElements.define("x-counter", CounterElement);
```

`<x-counter count="5" />` — attribute bound, reactive, works in any HTML context.

### Typed JSX for custom elements

Register the tag and augment the `CustomElementRegistry` interface — JSX infers the full prop shape (attributes, events, slots, children) from the class itself.

```ts
import { defineElement } from "elements-kit/custom-elements";

defineElement("x-counter", CounterElement);

declare module "elements-kit/custom-elements" {
  interface CustomElementRegistry {
    "x-counter": typeof CounterElement;
  }
}

// Now `<x-counter count={5} />` is fully typed — no hand-written `declare global` block.
```

See [Types](docs/src/content/docs/elements/types.mdx) for the full set of prop-inference helpers.

---

## React Integration

Connect signals and stores to React components via `useSyncExternalStore`:

```tsx
import { useSignal, useScope } from "elements-kit/integrations/react";
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

## Utilities

Pre-built reactive wrappers around common browser APIs. Each utility lives at its own subpath (`elements-kit/utilities/<name>`) and ships as its own entry — you pay only for what you import. Full catalog in [src/utilities/README.md](src/utilities/README.md).

`createMediaQuery` wraps `window.matchMedia` into a reactive signal — reads inside effects or computeds re-run automatically when the media query result changes.

```tsx
import { effect } from "elements-kit/signals";
import { createMediaQuery } from "elements-kit/utilities/media-query";

const isDark = createMediaQuery("(prefers-color-scheme: dark)");
const isMobile = createMediaQuery("(max-width: 640px)");

effect(() => document.documentElement.classList.toggle("dark", isDark()));
```

Singletons like `online`, `windowFocused`, `activeElement`, and `currentLocation` are pre-instantiated — import and read them directly inside any reactive context.

```ts
import { effect } from "elements-kit/signals";
import { online } from "elements-kit/utilities/network";
import { windowFocused } from "elements-kit/utilities/window-focus";

effect(() => console.log("online:", online(), "focused:", windowFocused()));
```

---

## Async & Promise

Two primitives convert imperative async work into reactive state: `promise` (minimal, any `Promise` → reactive state) and `async` (full controller with start/stop/run and optional reactive input).

### `promise`

Wraps an async function (or raw `Promise`) into a `ComputedPromise<T>` — awaitable **and** callable as a reactive value. Exposes `.state`, `.value`, `.reason`, `.result` as reactive reads.

```ts
import { promise } from "elements-kit/utilities/promise";
import { effect } from "elements-kit/signals";

const user = promise(() => fetch("/api/user").then((r) => r.json()));

effect(() => {
  if (user.state === "pending")   console.log("loading…");
  if (user.state === "fulfilled") console.log("user:", user.value);
  if (user.state === "rejected")  console.log("error:", user.reason);
});

await user; // awaitable
```

`ReactivePromise` is the underlying class — use it when you want the reactive state getters without the `Computed` callable interface.

### `async`

A controller around `promise`. The async function may be a plain function or a `MaybeReactive<Fn>` (so the body itself can re-read signals and rerun on change).

```ts
import { async } from "elements-kit/utilities/async";

const op = async(() => fetch("/api/items").then((r) => r.json()));

op.start();   // run with reactive tracking — reruns when tracked signals change
await op;     // awaitable (delegates to .then/.catch/.finally via .raw)
op.stop();    // halt reruns + fire registered cleanup
```

Reactive state getters: `.state`, `.value`, `.reason`, `.result`, `.pending`, `.raw` (the underlying `ComputedPromise`).

One-shot mutation (no tracking):

```ts
const del = async((id: number) =>
  fetch(`/api/items/${id}`, { method: "DELETE" }).then((r) => r.json()),
);

await del.run(42);
```

`Async` implements `Symbol.dispose`, so `using` auto-stops on scope exit:

```ts
{
  using poll = async(() => fetch("/api/poll").then((r) => r.json())).start();
  await poll;
} // poll.stop() here
```

### Composing with retry, online, storage

`async`'s reactive body composes with other utilities. Below: fetch a todo by `id()`, retry on failure with exponential backoff, pause while offline (returning the stale cached value), and refetch when the tab regains focus.

```ts
import { signal, effect, untracked, onCleanup } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";
import { retry } from "elements-kit/utilities/retry";
import { online } from "elements-kit/utilities/network";
import { windowFocused } from "elements-kit/utilities/window-focus";
import { createLocalStorage } from "elements-kit/utilities/storage";

const id = signal(1);
const cache = createLocalStorage<unknown>("todo-cache", null);

const fetchTodo = async(() => {
  if (!online()) return untracked(cache);   // pause while offline
  windowFocused();                          // refetch on tab focus
  return retry(() => {
    const controller = new AbortController();
    onCleanup(() => controller.abort());    // abort before each retry
    return fetch(`/api/todos/${id()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((value) => (cache(value), value));
  }, 3, (n) => n * 500)();                  // 0 ms, 500 ms, 1000 ms backoff
}).start();

effect(() => console.log(fetchTodo.state, fetchTodo.value));
```

---

## `For` — Keyed List Rendering

Reconciles a reactive array into the DOM. Each item renders once per key — no full re-renders on reorder, add, or remove. `T` is inferred from `each`.

```tsx
import { For } from "elements-kit/for";

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

## Prop types

Six type helpers derive JSX prop shapes from your components — no parallel `declare global` block to maintain. Full guide at [docs/src/content/docs/elements/types.mdx](docs/src/content/docs/elements/types.mdx).

| Helper | For |
| ------ | --- |
| `ElementProps<typeof Cls>` | `HTMLElement` subclass — full surface (attrs, events, slots, children) |
| `Props<C>` | Class instance, constructor, or function component — unified |
| `ComponentProps<typeof Cls>` | Class components with `constructor(props: P)` |
| `MaybeReactiveProps<P>` | Wrap every prop in `MaybeReactive` |
| `MaybeReactive<T>` | Scalar value-or-getter (from `elements-kit/signals`) |
| `Require<P, K>` | Promote optional keys to required |

Function components pair `MaybeReactiveProps<P>` on the signature with `resolveProps` at the top of the body — each key becomes a callable getter, subscribing to updates on read:

```tsx
import { resolveProps } from "elements-kit/signals";
import type { MaybeReactiveProps } from "elements-kit/jsx-runtime";

function Greeting(raw: MaybeReactiveProps<{ name: string }>) {
  const props = resolveProps(raw);
  return <p>Hello, {props.name}</p>;
}
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

For typed slots, attach a `[SLOTS]` instance field — pass the key list with `as const` so TS can narrow:

```ts
import { SLOTS, Slots } from "elements-kit/slot";

class Card extends HTMLElement {
  [SLOTS] = Slots.new(["header", "footer"] as const);
}
// ElementProps<typeof Card> now includes `slot:header` / `slot:footer`
```

For typed events, declare a `static events` map:

```ts
class XPicker extends HTMLElement {
  declare static events: { commit: CustomEvent<number> };
}
// ElementProps<typeof XPicker> now includes `on:commit`
```

---

## Roadmap

- [ ] Context — share state across a subtree without prop drilling
- [ ] UI library — pre-built reactive components built on ElementsKit primitives
- [ ] More framework integrations (Vue, Solid, Angular, …)
- [ ] Tutorial — building a full app from scratch
