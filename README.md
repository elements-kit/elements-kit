# ElementsKit 🌱

**Reactive primitives for any runtime.** Signals, data, routing, DOM and browser state, each one import. Use them in plain JavaScript, React, a custom element, or on the server. JSX, custom elements and the UI Kit are optional modules.

[![npm](https://img.shields.io/npm/v/elements-kit)](https://www.npmjs.com/package/elements-kit) [![license](https://img.shields.io/npm/l/elements-kit)](LICENSE)

[Docs](https://elements-kit.com) · [Playground](https://elements-kit.com/playground) · [Examples](https://elements-kit.com/examples/data-fetching)

```ts
import { signal, computed, effect } from "elements-kit/signals";
import { online } from "elements-kit/utilities/network";
import { createMediaQuery } from "elements-kit/utilities/media-query";
import { on } from "elements-kit/utilities/event-listener";

const clicks = signal(0);
const dark = createMediaQuery("(prefers-color-scheme: dark)");
const label = computed(() => `${clicks()} clicks · ${online() ? "online" : "offline"}`);

const button = document.querySelector("button")!;
on(button, "click", () => clicks(clicks() + 1));

effect(() => {
  button.textContent = label();
  document.body.classList.toggle("dark", dark());
});
```

No JSX, no framework, no build step beyond TypeScript.

## Install

```sh
npm install elements-kit
```

Using JSX? Add this to `tsconfig.json`:

```json
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "elements-kit" } }
```

## What's inside

Core is the only requirement. Every other module needs only Core, so take any combination.

| Module | Import | Docs |
| --- | --- | --- |
| [Core](#core) | `elements-kit/signals` | [Signals](https://elements-kit.com/signals) |
| [Primitives](#primitives) | `elements-kit/utilities/*` | [Catalog](https://elements-kit.com/primitives) |
| [Rendering](#rendering) | `elements-kit/render`, `/jsx-runtime`, `/server`, `/hydrate` | [JSX](https://elements-kit.com/elements) |
| [UI Kit](#ui-kit) | `elements-kit/ui/*` | [UI Kit](https://elements-kit.com/ui) |
| [Integrations](#integrations) | `elements-kit/integrations/*` | [Integrations](https://elements-kit.com/integrations) |

### Core

Fine-grained reactive state. Only the computeds and effects that read a changed signal re-run.

- `signal`, `computed`, `effect`, `batch`, `untracked`, `onCleanup`
- `effectScope` groups effects and disposes them together
- `@reactive()` turns class fields into signals: a store is just a class

```ts
import { reactive, computed, effect } from "elements-kit/signals";

class Cart {
  @reactive() items: { name: string; price: number }[] = [];
  total = computed(() => this.items.reduce((sum, item) => sum + item.price, 0));
}

const cart = new Cart();
effect(() => console.log("total:", cart.total()));
cart.items = [...cart.items, { name: "Tea", price: 4 }]; // total: 4
```

Docs: [Signals](https://elements-kit.com/signals) · [Stores](https://elements-kit.com/stores) · [Scopes](https://elements-kit.com/scopes)

### Primitives

Small factories that return signals and clean up with their scope. One subpath each: `elements-kit/utilities/<name>`.

| Area | Primitives |
| --- | --- |
| Data | `promise`, `async`, `retry`, `createLocalStorage`, `createSessionStorage` |
| Forms | `FormObject` |
| Routing | `currentLocation`, `createSearchParam`, `navigate`, `matches`, `match` |
| Context | `setContext`, `getContext` |
| DOM events | `on`, `createHover`, `createFocusWithin`, `onClickOutside`, `createLongPress` |
| Observers | `createElementRect`, `createElementScroll`, resize, intersection, mutation |
| Browser state | `createMediaQuery`, `windowSize`, `orientation`, `online`, `windowFocused` |
| Timing | `createTimeout`, `createInterval`, `createDebounced`, `createThrottled`, `createPrevious` |
| Extend | `fromEvent`, `sync`: wrap any event API as a signal |

```ts
import { signal } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";
import { retry } from "elements-kit/utilities/retry";

const query = signal("tea");

// Re-runs when `query` changes; state, value and error are signals.
const search = async(() => {
  const q = query(); // read before any await so it is tracked
  return retry(() => fetch(`/api?q=${q}`).then((r) => r.json()), 3)();
}).start();
```

Docs: [Catalog](https://elements-kit.com/primitives) · [Async](https://elements-kit.com/primitives/async) · [Routing](https://elements-kit.com/primitives/routing)

### Rendering

Optional. JSX compiles to real `document.createElement` calls, with no virtual DOM. Pass a signal or a function and that one spot in the DOM stays live.

- `render(target, setup)` mounts and returns `unmount`
- `For` renders keyed lists; `Slot` and `@attributes` build native custom elements
- `renderToStream` / `renderToString` render on any JS runtime; `hydrate` adopts the HTML

```tsx
import { signal } from "elements-kit/signals";
import { render } from "elements-kit/render";

const count = signal(0);

render(document.getElementById("app")!, () => (
  <button on:click={() => count(count() + 1)}>Clicked {count} times</button>
));
```

Docs: [JSX](https://elements-kit.com/elements) · [Custom elements](https://elements-kit.com/custom-elements) · [Server rendering](https://elements-kit.com/server-rendering)

### UI Kit

Optional. Accessible component styles in plain CSS, an optional base theme (`elements-kit/ui/styles.css`), and behaviors such as `otp-input` and overlay positioning. Catalog in [src/ui/README.md](src/ui/README.md).

Docs: [UI Kit](https://elements-kit.com/ui) · [Storybook](https://elements-kit.com/storybook/)

### Integrations

Read any signal or store from your framework. React ships `useSignal` and `useScope`; Astro, Vite, Vue, Svelte, Solid, Angular, Lit, Qwik and Marko have guides.

```tsx
import { useSignal } from "elements-kit/integrations/react";

function Total() {
  const total = useSignal(cart.total); // same Cart as above
  return <p>${total}</p>;
}
```

Docs: [React](https://elements-kit.com/integrations/react) · [All integrations](https://elements-kit.com/integrations)

## Why ElementsKit

- **Compose, don't configure.** Small focused APIs you combine, not one overloaded interface.
- **Close to the platform.** `promise` extends `Promise`; custom elements *are* `HTMLElement`; JSX is `document.createElement`.
- **Predictable and explicit.** Signals are reactive; nothing else is. No proxies, no hidden subscriptions.
- **Designed for the AI age.** Code is cheap, maintenance isn't. Swap one block at a time. Machine-readable docs: [llms.txt](https://elements-kit.com/llms.txt).

## Learn more

- [Documentation](https://elements-kit.com): guides, live playgrounds, reference
- [ARCHITECTURE.md](ARCHITECTURE.md): how the library works
- [CONTRIBUTING.md](CONTRIBUTING.md): build, test, PR checklist

## License

[MIT](LICENSE)

## Maintained by

ElementsKit is built and maintained by the [Quba](https://www.quba.co) team.
