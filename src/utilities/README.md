# Utilities

Reactive utilities built on top of the core signal primitives (`signal`, `computed`, `effect`, `effectScope`, `onCleanup`, `trigger`, `batch`, `untracked`).

See [root README](../../README.md) for library overview and [SPEC.md](../../SPEC.md) for the cleanup convention, quality bars, and module-dependency rules that apply to every helper listed below.

Each utility is its own subpath: `elements-kit/utilities/<name>`. Files are the source of truth; this catalog is kept in sync manually — open a PR if you spot drift.

All modules are import-safe in Node (see `environment.ts` for the shared `isBrowser` guard). Singletons that wrap browser APIs degrade to neutral defaults outside a browser — full reactivity requires a DOM.

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
    ├── debounced.ts
    ├── interval.ts
    ├── previous.ts
    ├── retry.ts
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
| **location** | `currentLocation`, `createLocation()` | `{ href, pathname, search, hash }` (each `Computed<string>`) |
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

| Module | Export | Returns | Deps |
|--------|--------|---------|------|
| **search-params** | `createSearchParam(key)` | `Computed<string \| null>` | `event-listener` |

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

## React integration

Defined in [../integrations/react.ts](../integrations/react.ts), not under `utilities/`, but commonly composed with utilities.

| Export | Description |
|--------|-------------|
| `useSignal(reader)` | Subscribes a React component to a `Signal<T>`, `Computed<T>`, or `() => T` via `useSyncExternalStore`. |
| `useScope(callback)` | `effectScope` tied to the component's lifetime. |

---

## Cleanup convention

Every helper that allocates a resource follows these rules (see [SPEC.md §6](../../SPEC.md)):

1. **`onCleanup`** — teardown is registered with the current `effect` / `effectScope` / `computed`. Scope disposal removes all listeners / observers / timers automatically.
2. **`Disposable`** — helpers that return composite objects expose `[Symbol.dispose]` for explicit teardown or `using`.
3. **No `Disposable` on core reactive values** — helpers returning raw `Signal<T>` / `Computed<T>` rely on `onCleanup` only. Attaching `Symbol.dispose` to the callable would be unsafe.

When called inside an `effectScope`, cleanup happens on scope disposal. For explicit teardown, dispose the scope (call the function returned by `effectScope`) or the `Disposable`.

---

## Environment safety

The six module-level singletons (`activeElement`, `currentLocation`, `online`, `orientation`, `windowFocused`, `windowSize`) currently touch DOM globals at module load. See the SSR safety plan for the import-safety work in progress. Until that lands, these modules throw when imported in Node. All factory-style utilities (`createX`) are import-safe — DOM access happens only when the factory is called.
