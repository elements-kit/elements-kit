# Utilities

Reactive helpers over core primitives (`signal`, `computed`, `effect`, `effectScope`, `onCleanup`, `trigger`, `batch`, `untracked`).

Overview → [README](../../README.md). Contracts (cleanup, deps) → [ARCHITECTURE](../../ARCHITECTURE.md). Quality bars + versioning → [CONTRIBUTING](../../CONTRIBUTING.md).

Each module = one subpath: `elements-kit/utilities/<name>`. Source files are authoritative — open a PR on drift.

Node import-safe. Shared `isBrowser` in `environment.ts`. Singletons degrade to neutral defaults outside a browser; full reactivity needs DOM.

---

## Dependency graph

```text
Core primitives (signal, computed, effect, onCleanup, trigger, batch, untracked)
├── event-listener.ts ─── on
│   ├── element-scroll.ts
│   ├── focus-within.ts
│   ├── hover.ts
│   ├── long-press.ts
│   ├── media-devices.ts
│   ├── network.ts
│   ├── on-click-outside.ts
│   ├── search-params.ts
│   └── window-focus.ts
│
├── event-driven.ts ─── fromEvent / sync
│   ├── active-element.ts
│   ├── location.ts
│   ├── media-player.ts
│   ├── orientation.ts
│   └── window-size.ts
│
├── resize-observer.ts ─── createResizeObserver
│   └── element-rect.ts
│
├── intersection-observer.ts ─── createIntersectionObserver
│
├── mutation-observer.ts ─── createMutationObserver
│
├── media-query.ts ─── createMediaQuery, isBrowser
│
├── promise.ts ─── promise, ReactivePromise
│   └── async.ts ─── async, Async
│
└── standalone (no intra-utilities deps)
    ├── context.ts
    ├── debounced.ts
    ├── dom-lifecycle.ts
    ├── interval.ts
    ├── previous.ts
    ├── retry.ts
    ├── form-object.ts
    ├── routing.ts
    ├── storage.ts
    ├── throttled.ts
    └── timeout.ts
```

---

## Core

Foundations used by other helpers.

| Module | Export | Description |
|--------|--------|-------------|
| **event-listener** | `on(target, type, handler, options?)` | Type-safe event listener with auto-cleanup via `onCleanup`. Target may be a reactive getter (re-registers when target changes). |
| **event-driven** | `fromEvent(target, events)`, `sync(subscribe, getter, setter?)`, `Subscribe` type | Declarative DOM-state-to-signal bridge. `fromEvent` builds a `Subscribe` from DOM events; `sync` keeps a `Computed<T>` (or writable `Signal<T>` if a setter is given) aligned with an external source. |
| **resize-observer** | `createResizeObserver(target, callback)` | `ResizeObserver` with auto-cleanup. |
| **intersection-observer** | `createIntersectionObserver(target, callback, options?)` | `IntersectionObserver` with auto-cleanup. |
| **mutation-observer** | `createMutationObserver(target, options, callback)` | `MutationObserver` with auto-cleanup. |
| **media-query** | `createMediaQuery(query, defaultState?)`, `isBrowser` | `window.matchMedia` as a `Computed<boolean>`. `isBrowser` is the shared environment guard. |

### When to use which

- **`sync` + `fromEvent`** — DOM state read via getter on events. Signal is a lazy `computed` that re-reads on each event.
- **`on`** — when you need the event object itself (`e.clientX`, `e.key`) or listener options (`{ passive: true }`).

---

## DOM events

| Module | Export | Returns | Deps |
|--------|--------|---------|------|
| **active-element** | `activeElement` (singleton) | `Computed<Element \| null>` | `event-driven` |
| **focus-within** | `createFocusWithin(target)` | `Computed<boolean>` | `event-listener` |
| **hover** | `createHover(target)` | `Computed<boolean>` | `event-listener` |
| **long-press** | `createLongPress(target, handler, options?)` | `Disposable` | `event-listener` |
| **on-click-outside** | `onClickOutside(target, handler)` | `void` | `event-listener` |

---

## Window / environment

Page-level singletons. Importing is safe — reading before DOM is available returns neutral defaults.

| Module | Export | Returns |
|--------|--------|---------|
| **active-element** | `activeElement` | `Computed<Element \| null>` |
| **location** | `currentLocation` | `{ href, pathname, search, hash }` (each `Computed<string>`) |
| **media-devices** | `createMediaDevices()` | `Computed<MediaDeviceInfo[]>` |
| **network** | `online` | `Computed<boolean>` |
| **orientation** | `orientation` | `{ angle, type }` |
| **window-focus** | `windowFocused` | `Computed<boolean>` |
| **window-size** | `windowSize` | `{ width, height }` |

---

## Element observation

| Module | Export | Returns | Deps |
|--------|--------|---------|------|
| **element-rect** | `createElementRect(target)` | `{ x, y, width, height, top, right, bottom, left } & Disposable` | `resize-observer` |

---

## Scrolling

| Module | Export | Returns | Deps |
|--------|--------|---------|------|
| **element-scroll** | `createElementScroll(target)` | `{ x: Signal<number>, y: Signal<number> } & Disposable` | `event-listener` |

---

## Media elements

| Module | Export | Returns | Deps |
|--------|--------|---------|------|
| **media-player** | `createMediaPlayer(element)` | `{ element, playing, muted, volume, duration, time, ended, play(), pause(), toggle() } & Disposable` | `event-driven` |

`muted`, `volume`, `time` are writable `Signal<T>` — assignment drives the underlying `<audio>` / `<video>`. `playing`, `duration`, `ended` are read-only `Computed<T>`.

---

## Forms / URL

| Module            | Export                                              | Returns                                                                                                                                       | Deps             |
|-------------------|-----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|------------------|
| **search-params** | `createSearchParam(key)`                            | `Computed<string \| null>`                                                                                                                    | `event-listener` |
| **form-object**   | `FormObject`, `defaultTransforms`, field transforms | Nested object ↔ form via dot-notation names. `toObject` / `fromObject` / `clear`; extraction runs a composable `FormFieldTransform` pipeline. | —                |

---

## Routing

| Module | Export | Description |
|--------|--------|-------------|
| **routing** | `patchHistory()` | Patches `history.pushState` / `replaceState` to fire events consumable by `matches` / `match`. |
| **routing** | `navigate(url, options?)` | Client-side navigation. |
| **routing** | `isLocalNavigationEvent(e)` | Predicate for anchor clicks (same-origin, no modifiers). |
| **routing** | `matches(pattern)` | `Computed<boolean>` — true when current URL matches. |
| **routing** | `match(pattern)` | `Computed<URLPatternResult \| null>` — full match result. |

Uses `URLPattern`. Consumers on browsers without native support must load a polyfill themselves (e.g. `urlpattern-polyfill`).

---

## Timing

| Module | Export | Returns |
|--------|--------|---------|
| **debounced** | `createDebounced(getter, delay)` | `Computed<T>` |
| **interval** | `createInterval(callback?, delay)` | `{ pending, start(), stop(), reset() } & Disposable` |
| **throttled** | `createThrottled(getter, interval)` | `Computed<T>` |
| **timeout** | `createTimeout(callback, delay)` | `{ isPending, start(), stop(), reset() } & Disposable` |

---

## State

| Module | Export | Returns |
|--------|--------|---------|
| **previous** | `createPrevious(getter, isEqual?)` | `Computed<T \| undefined>` |
| **storage** | `createLocalStorage<T>(key, initialValue, options?)` | `Signal<T>` |
| **storage** | `createSessionStorage<T>(key, initialValue, options?)` | `Signal<T>` |

---

## Async

| Module | Export | Description |
|--------|--------|-------------|
| **promise** | `promise(fn \| Promise<T>)` | Wraps a promise/async fn as a `ComputedPromise<T>` — awaitable and callable as reactive state with `.state`, `.value`, `.reason`, `.result`. |
| **promise** | `ReactivePromise<T, E>` | Class form. Use when you need the state getters without the `Computed` callable. |
| **async** | `async(fn)` | Returns an `Async` controller. Reactive wrapper over `promise`. |
| **async** | `Async<TInput, TOutput>` | `.start()` / `.run(input?)` / `.stop()` / `Symbol.dispose`; getters `.state`, `.value`, `.reason`, `.result`, `.pending`, `.raw`; thenable. |
| **retry** | `retry(fn, attempts, backoff?)` | Returns a function that retries on rejection with backoff. |

---

## Context

DOM-tree dependency injection. Provider registers a value on a host element; descendants look it up by walking `parentNode` (crossing into shadow hosts via `getRootNode().host`). Innermost provider wins. Caller picks any `PropertyKey`; reactivity is opt-in by passing a `Signal` / `Computed`.

| Module | Export | Description |
|--------|--------|-------------|
| **context** | `setContext(host, key, value)` | Register `value` on `host`. Auto-removed via `onCleanup` when the surrounding scope disposes. Must run inside an `effect` / `effectScope` / wrapped `connectedCallback`. |
| **context** | `getContext<T>(consumer, key)` | One-shot ancestor walk. Returns the first registered value for `key`, or `undefined`. Does not subscribe — reactivity is the caller's responsibility (read the returned `Signal` inside an `effect`). |

`getContext` requires the consumer to be in the DOM tree at call time. Safe inside `connectedCallback`, event handlers, or a [`<dom-lifecycle>`](#dom-lifecycle) `onConnect`. JSX `ref` runs *before* parent insertion, so a synchronous `getContext` there returns `undefined` — defer with `<dom-lifecycle>`:

```tsx
import { signal } from "elements-kit/signals";
import { getContext } from "elements-kit/utilities/context";
import "elements-kit/utilities/dom-lifecycle";

const theme = signal<unknown>(undefined);
return (
  <div>
    <dom-lifecycle onConnect={(el) => {
      const parent = el.parentElement;
      if (parent) theme(getContext(parent, THEME));
    }} />
    …
  </div>
);
```

---

## DOM lifecycle {#dom-lifecycle}

Drop-in custom element. Place inside any element to receive lifecycle notifications for the surrounding subtree — built on the platform's `connectedCallback` / `disconnectedCallback`, no `MutationObserver` machinery, no global registry. Useful when a `ref` callback is too early — e.g. resolving `getContext`, measuring layout, or attaching observers that need a connected ancestor. Can also wrap children to react to mount/unmount of an existing subtree.

Position-tracking callbacks (`onConnect`, `onDisconnect`, `onMove`) receive the lifecycle element itself. Read `self.parentElement` for the surrounding element, `self.firstElementChild` / `self.children` for wrapped content, or walk through a shadow root via `self.getRootNode()`. `self` is always non-null — even when the lifecycle element is the direct child of a `ShadowRoot` (where `parentElement` would be `null`).

Render-inert by default: `display: contents` removes its layout box, `role="none"` strips its implicit a11y role. Children participate in layout and a11y as if the wrapper weren't there. Note: structural CSS selectors (`:empty`, `:first-child`, `:nth-child`) still see the element in the DOM tree.

| Module | Export | Description |
|--------|--------|-------------|
| **dom-lifecycle** | `<dom-lifecycle>` | Custom element with four callbacks. `onConnect(self)` / `onDisconnect(self)` mirror `connectedCallback` / `disconnectedCallback` and receive the lifecycle element. `onMove(self)` mirrors the upcoming `connectedMoveCallback` — fires on `Node.moveBefore()` repositioning. `onAdopted(oldDoc, newDoc)` mirrors `adoptedCallback`. Inside `onDisconnect`, `self.parentElement` is `null` per spec — capture the parent in `onConnect` if you need it. The user removes the element themselves; it does not self-remove. |
| **dom-lifecycle** | `DomLifecycleElement` | The class. Imported when you need the type, or to assign callbacks programmatically (`document.createElement("dom-lifecycle") as DomLifecycleElement`). Auto-defined on first import. |

```tsx
import "elements-kit/utilities/dom-lifecycle";

<div>
  <dom-lifecycle
    onConnect={(el) => el.parentElement?.classList.add("ready")}
    onDisconnect={(el) => {
      // el.parentElement is null here per spec — stash from onConnect if needed
    }}
  />
</div>
```

Wrap children — read the wrapped subtree through `self.firstElementChild`:

```tsx
<section>
  <dom-lifecycle onConnect={(el) => measure(el.firstElementChild)}>
    <h1>Title</h1>
    <p>Body</p>
  </dom-lifecycle>
</section>
```

Wrap children to consume context — call `getContext(self, …)` inside `onConnect`. The walk goes from the wrapper up through its ancestors, so any outer provider resolves; expose the result as a signal that wrapped children read:

```tsx
import { signal } from "elements-kit/signals";
import { getContext } from "elements-kit/utilities/context";
import "elements-kit/utilities/dom-lifecycle";

const THEME = Symbol("theme");

function ThemedSection() {
  const theme = signal<string | undefined>(undefined);
  return (
    <dom-lifecycle onConnect={(el) => theme(getContext<string>(el, THEME))}>
      <h1 data-theme={() => theme() ?? "default"}>Title</h1>
      <p data-theme={() => theme() ?? "default"}>Body</p>
    </dom-lifecycle>
  );
}
```

The wrapper sits transparently in the ancestor walk, so wrapped children can also call `getContext` directly on themselves and reach the same outer provider. Use `onConnect` when you need to fan the value out to multiple children via a single signal, or to read context once at mount. Verified in [context.test.ts](context.test.ts) under `with <dom-lifecycle> as wrapper`.

`<dom-lifecycle>` only fires on its **own** (re)connection — it does **not** observe descendant mutations. To track per-child mount/unmount inside its subtree, nest a `<dom-lifecycle>` per child or use `createMutationObserver` (from `elements-kit/utilities/mutation-observer`) on `el` inside `onConnect`.

Works inside open and closed shadow roots, after `cloneNode(true)`, and after `innerHTML` upgrade — same guarantees the platform gives any custom element. Strict CSP friendly (no inline `<script>`).

---

## React integration

Defined in [../integrations/react.ts](../integrations/react.ts), not under `utilities/`, but commonly composed with utilities.

| Export | Description |
|--------|-------------|
| `useSignal(reader)` | Subscribes a React component to a `Signal<T>`, `Computed<T>`, or `() => T` via `useSyncExternalStore`. |
| `useScope(callback)` | `effectScope` tied to the component's lifetime. |

---

## Cleanup

Full rules → [ARCHITECTURE §6](../../ARCHITECTURE.md). Short version: `onCleanup` in current scope auto-disposes. Composite returns expose `[Symbol.dispose]` / `using`. Raw `Signal` / `Computed` never carry `Symbol.dispose`.

## Environment

Six singletons (`activeElement`, `currentLocation`, `online`, `orientation`, `windowFocused`, `windowSize`) read DOM globals at module load. Node-safe via `isBrowser` gate — degrade to neutral defaults. Factories (`createX`) always import-safe.
