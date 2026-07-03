# ElementsKit 🌱

**Universal reactive primitives for the web.** Signals, JSX, custom elements, and browser-API helpers. Import one at a time, compose them, or use any of them inside vanilla JS, React, Vue, or any framework.

```tsx
import { signal, computed } from "elements-kit/signals";
import { render } from "elements-kit/render";
import type { ReactiveProps } from "elements-kit/jsx-runtime";

function Counter(props: ReactiveProps<{ initial?: number }>) {
  const count = signal(props.initial() ?? 0);
  const doubled = computed(() => count() * 2);

  return (
    <section>
      <p><strong>{count}</strong> × 2 = <strong>{doubled}</strong></p>
      <button on:click={() => count(count() + 1)}>+1</button>{" "}
      <button on:click={() => count(count() - 1)}>−1</button>
    </section>
  );
}

render(document.getElementById("app")!, () => <Counter initial={0} />);
```

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

## Why ElementsKit

ElementsKit is a library of reactive primitives, not a framework. Each piece is its own import, runs on its own, and composes with the others — inside React, inside a custom element, or on its own in a script.

- **Compose, don't configure.** Small focused APIs — `signal`, `computed`, `on`, `fromEvent`, `async`. Combine primitives instead of maintaining an overloaded interface.

- **Close to the platform.** JSX compiles to `document.createElement`. `promise` extends `Promise`. Custom elements *are* `HTMLElement`. Thin or absent abstraction layers — no virtual DOM, no proxies, no build steps.

- **Predictable and explicit — no magic.** `signal/compose` are reactive; nothing else is. No heuristic dependency tracking, no hidden subscriptions.

- **Designed for the AI age.** Code is cheap; maintenance still isn't. Primitives compose into higher-level blocks. Swap one block at a time instead of maintaining long lines of code.

- **Bundler-friendly.** Every primitive is its own subpath — `elements-kit/signals`, `elements-kit/utilities/*`, `elements-kit/integrations/*`. Import only what you need.

## Packages

Every feature is a separate subpath export — import only what you use.

| Entry | Purpose |
|-------|---------|
| `elements-kit/signals` | `signal`, `computed`, `effect`, `effectScope`, `batch`, `untracked`, `trigger`, `onCleanup`, `MaybeReactive`, `resolve`, `resolveProps`, `@reactive` |
| `elements-kit/render` | `render(target, setup)` — mount a node with a scoped lifetime; returns `unmount` |
| `elements-kit/attributes` | `@attributes` decorator + `ATTRIBUTES` symbol |
| `elements-kit/slot` | `Slot`, `Slots`, `SLOTS` symbol — comment-marker DOM regions |
| `elements-kit/custom-elements` | `defineElement`, `CustomElementRegistry` |
| `elements-kit/for` | `For` keyed-list component |
| `elements-kit/jsx-runtime` | JSX factory + type helpers (`ElementProps`, `Props`, `ComponentProps`, `MaybeReactiveProps`, `ReactiveProps`, `Require`) — configure via `jsxImportSource` |
| `elements-kit/server` | `renderToStream`, `renderToString` — streaming HTML rendering in any JS runtime (Node, edge/Workers), no DOM required *(experimental)* |
| `elements-kit/hydrate` | `hydrate(container, () => <App/>)` — adopt server-rendered DOM and make it interactive *(experimental)* |
| `elements-kit/integrations/react` | `useSignal`, `useScope` React bridge hooks |
| `elements-kit/utilities/*` | Reactive browser-API utilities — see [src/utilities/README.md](src/utilities/README.md) |

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

Register the tag and augment `ElementsKit.CustomElementRegistry` in the global namespace — JSX infers the full prop shape (attributes, events, slots, children) from the class itself.

```ts
import { defineElement } from "elements-kit/custom-elements";

defineElement("x-counter", CounterElement);

declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {
      "x-counter": typeof CounterElement;
    }
  }
}

// Now `<x-counter count={5} />` is fully typed.
```

See [Types](docs/src/content/docs/elements/types.mdx) for the full set of prop-inference helpers.

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

## Prop types

Six type helpers derive JSX prop shapes from your components — no parallel `declare global` block to maintain. Full guide at [docs/src/content/docs/elements/types.mdx](docs/src/content/docs/elements/types.mdx).

| Helper | For |
| ------ | --- |
| `ElementProps<typeof Cls>` | `HTMLElement` subclass — full surface (attrs, events, slots, children) |
| `Props<C>` | Class instance, constructor, or function component — unified |
| `ComponentProps<typeof Cls>` | Class components with `constructor(props: P)` |
| `MaybeReactiveProps<P>` | Caller-facing — wrap every prop in `MaybeReactive` (what parents pass) |
| `ReactiveProps<P>` | Component-facing — every prop becomes a `Computed<T>` getter (what function components receive) |
| `MaybeReactive<T>` | Scalar value-or-getter (from `elements-kit/signals`) |
| `Require<P, K>` | Promote optional keys to required |

The JSX runtime auto-wraps function-component props — each key arrives as a callable getter that subscribes on read. Pair the signature with `ReactiveProps<P>` and read `props.x()`:

```tsx
import type { ReactiveProps } from "elements-kit/jsx-runtime";

function Greeting(props: ReactiveProps<{ name: string }>) {
  return <p>Hello, {props.name}</p>;
}
```

`resolveProps` stays exported for non-JSX call sites or nested prop bags.

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

## Learn more

- [Documentation site](docs/) — guides, playgrounds, reference
- [Philosophy](docs/src/content/docs/getting-started/philosophy.mdx) — deeper reasoning behind the five principles
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the library works
- [CONTRIBUTING.md](CONTRIBUTING.md) — build, test, PR checklist

