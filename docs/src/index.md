# ElementsKit

A signal-based reactive JSX framework for the browser. No virtual DOM — direct DOM manipulation with fine-grained reactivity.

## Installation

```sh
npm install elements-kit
```

## Signals

Reactivity is built on signals from [`alien-signals`](https://github.com/stackblitz/alien-signals).

```ts
import { signal, computed, effect } from "elements-kit/signals";

const count = signal(0);
const doubled = computed(() => count() * 2);

effect(() => {
  console.log(`count: ${count()}, doubled: ${doubled()}`);
});

count(1); // logs: count: 1, doubled: 2
```

## JSX Components

Components are classes with a `render()` method. Use `@reactive()` to make fields signal-backed.

```tsx
import { reactive } from "elements-kit/signals";

class Counter {
  @reactive() count = 0;

  render() {
    return (
      <div>
        <p>Count: {() => this.count}</p>
        <button on:click={() => this.count++}>Increment</button>
      </div>
    );
  }
}

document.body.appendChild(new Counter().render());
```

## Reactive Props

| Syntax | Description |
| --- | --- |
| `value={signal}` | Live-bound reactive value |
| `on:click={fn}` | Event listener |
| `class:active={bool}` | Toggle a CSS class |
| `style:color={value}` | Reactive inline style |

## Building a Counter

Step through the construction of a reactive `Counter` component — from a bare signal to a full component with buttons.

<div id="demo-magic-move"></div>
