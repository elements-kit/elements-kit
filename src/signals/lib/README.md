# Signal Helpers (`src/signals/lib/`)

Reactive utilities built on top of the core signal primitives (`signal`, `computed`, `effect`, `effectScope`, `onCleanup`, `trigger`, `batch`, `untracked`).

---

## Dependency Graph

```text
Core Primitives (signal, computed, effect, onCleanup, trigger …)
├── event-listener.ts ─── createEventListener
│   ├── before-unload.ts
│   ├── hover.ts
│   ├── is-focus-within.ts
│   ├── is-idle.ts
│   ├── key-press.ts
│   ├── long-press.ts
│   ├── media-devices.ts
│   ├── motion.ts
│   ├── mouse-position.ts
│   ├── mouse-wheel.ts
│   ├── network-state.ts
│   ├── on-click-outside.ts
│   ├── page-leave.ts
│   ├── pressed-keys.ts
│   ├── scroll-state.ts
│   ├── scrolling.ts
│   ├── search-params.ts
│   └── start-typing.ts
│
├── event-driven.ts ─── fromEvent / sync
│   ├── active-element.ts
│   ├── audio.ts
│   ├── fullscreen.ts
│   ├── hash.ts
│   ├── is-document-visible.ts
│   ├── media.ts
│   ├── orientation.ts
│   ├── video.ts
│   └── window-size.ts
│
├── resize-observer.ts ─── createResizeObserver
│   ├── element-rect.ts
│   └── element-size.ts
│
├── intersection-observer.ts ─── createIntersectionObserver
│   └── is-in-viewport.ts
│
└── (standalone — no lib/ dependencies)
    ├── animation-frames.ts
    ├── async-retry.ts
    ├── battery.ts
    ├── clipboard.ts
    ├── counter.ts
    ├── debounced.ts
    ├── document-title.ts
    ├── favicon.ts
    ├── finite-state-machine.ts
    ├── geolocation.ts
    ├── interval.ts
    ├── list.ts
    ├── lock-body-scroll.ts
    ├── map.ts
    ├── mutation-observer.ts
    ├── permission.ts
    ├── persisted-state.ts
    ├── previous.ts
    ├── previous-distinct.ts
    ├── queue.ts
    ├── raf.ts
    ├── resource.ts
    ├── set.ts
    ├── state-history.ts
    ├── state-validator.ts
    ├── throttled.ts
    ├── timeout.ts
    ├── toggle.ts
    └── watch.ts
```

---

## Core Utilities

These are the foundational building blocks used by many other helpers.

| Utility | Export | Description |
|---------|--------|-------------|
| **event-listener** | `createEventListener(target, type, handler, options?)` | Attaches a type-safe event listener with auto-cleanup via `onCleanup`. Supports reactive getter targets (re-registers when target changes). |
| **event-driven** | `Subscribe`, `fromEvent(target, events)`, `sync(subscribe, getter, setter?)` | Declarative DOM-state-to-signal bridge. `fromEvent` creates a `Subscribe` for DOM events; `sync` keeps a `Computed` (or writable `Signal` with setter) in sync with an external source. |
| **resize-observer** | `createResizeObserver(target, callback)` | Wraps `ResizeObserver` with auto-cleanup via `onCleanup`. |
| **intersection-observer** | `createIntersectionObserver(target, callback, options?)` | Wraps `IntersectionObserver` with auto-cleanup via `onCleanup`. |
| **mutation-observer** | `createMutationObserver(target, options, callback)` | Wraps `MutationObserver` with auto-cleanup via `onCleanup`. |

### When to use which

- **`sync` + `fromEvent`** — When you want to read DOM state on events (getter pattern). The signal is a lazy `computed` that re-reads the getter when events fire.
- **`createEventListener`** — When you need the event object itself (e.g. `e.clientX`, `e.key`) or need listener options like `{ passive: true }`.

---

## DOM Events

Helpers that track DOM event-driven state.

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **active-element** | `createActiveElement()` | `Computed<Element \| null>` | `event-driven` |
| **hover** | `createHover(target)` | `Computed<boolean>` | `event-listener` |
| **is-focus-within** | `createIsFocusWithin(target)` | `Computed<boolean>` | `event-listener` |
| **key-press** | `createKeyPress(key)` | `{ pressed: Computed<boolean> } & Disposable` | `event-listener` |
| **long-press** | `createLongPress(target, handler, options?)` | `Disposable` | `event-listener` |
| **mouse-position** | `createMousePosition()` | `{ x, y: Computed<number> } & Disposable` | `event-listener` |
| **mouse-wheel** | `createMouseWheel()` | `Computed<number>` | `event-listener` |
| **on-click-outside** | `createOnClickOutside(target, handler)` | `void` | `event-listener` |
| **pressed-keys** | `createPressedKeys()` | `Computed<ReadonlySet<string>>` | `event-listener` |
| **start-typing** | `createStartTyping(handler, idleMs?)` | `Disposable` | `event-listener` |

---

## Browser APIs

Helpers that wrap browser APIs as reactive signals.

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **battery** | `createBattery()` | `{ supported, charging, level, chargingTime, dischargingTime } & Disposable` | — |
| **clipboard** | `createClipboard(resetDelay?)` | `{ copied, value, copy() }` | — |
| **fullscreen** | `createFullscreen(target?)` | `{ isFullscreen, enter(), exit(), toggle() } & Disposable` | `event-driven` |
| **geolocation** | `createGeolocation(options?)` | `{ position, error, loading } & Disposable` | — |
| **hash** | `createHash()` | `Signal<string>` | `event-driven` |
| **is-document-visible** | `createIsDocumentVisible()` | `Computed<boolean>` | `event-driven` |
| **lock-body-scroll** | `createLockBodyScroll()` | `Disposable` | — |
| **media** | `createMediaSignal(query, defaultState?)` | `Computed<boolean>` | `event-driven` |
| **media-devices** | `createMediaDevices()` | `Computed<MediaDeviceInfo[]>` | `event-listener` |
| **motion** | `createMotion()` | `{ acceleration, rotationRate, interval, … } & Disposable` | `event-listener` |
| **network-state** | `createNetworkState()` | `{ online, downlink, effectiveType, rtt, saveData } & Disposable` | `event-listener` |
| **orientation** | `createOrientation()` | `{ angle, type } & Disposable` | `event-driven` |
| **permission** | `createPermission(descriptor)` | `{ state } & Disposable` | — |
| **search-params** | `createSearchParams()` | `{ params, get(), set(), delete() } & Disposable` | `event-listener` |
| **window-size** | `createWindowSize()` | `{ width, height } & Disposable` | `event-driven` |

---

## Element Observation

Helpers that observe element properties using browser observers.

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **element-rect** | `createElementRect(target)` | `{ x, y, width, height, top, right, bottom, left } & Disposable` | `resize-observer` |
| **element-size** | `createElementSize(target)` | `{ width, height } & Disposable` | `resize-observer` |
| **is-in-viewport** | `createIsInViewport(target, options?)` | `Computed<boolean>` | `intersection-observer` |

---

## Media Elements

Reactive wrappers for `<audio>` and `<video>` elements.

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **audio** | `createAudio(element)` | `{ element, playing, muted, volume, duration, time, ended, play(), pause(), toggle() } & Disposable` | `event-driven` |
| **video** | `createVideo(element)` | `{ element, playing, muted, volume, duration, time, ended, play(), pause(), toggle() } & Disposable` | `event-driven` |

`muted`, `volume`, and `time` are writable `Signal<T>` — writing them updates the underlying element. `playing`, `duration`, and `ended` are read-only `Computed<T>`.

---

## Scrolling

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **scroll-state** | `createScrollState(target?)` | `{ x, y, directionX, directionY } & Disposable` | `event-listener` |
| **scrolling** | `createScrolling(target?, delay?)` | `Computed<boolean>` | `event-listener` |

---

## Page Lifecycle

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **before-unload** | `createBeforeUnload(message?)` | `Disposable` | `event-listener` |
| **document-title** | `createDocumentTitle(initial?)` | `Signal<string>` | — |
| **favicon** | `createFavicon(initial?)` | `Signal<string>` | — |
| **is-idle** | `createIsIdle(timeout?)` | `Computed<boolean>` | `event-listener` |
| **page-leave** | `createPageLeave(handler)` | `Disposable` | `event-listener` |

---

## Data Structures

Reactive collection primitives.

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **counter** | `createCounter(initial?, options?)` | `Signal<number> & { increment(), decrement(), reset() }` | — |
| **list** | `createList(initial?)` | `{ items, push(), pop(), remove(), filter(), set(), clear(), size }` | — |
| **map** | `createMap(initial?)` | `{ entries, get(), set(), delete(), has(), clear(), size }` | — |
| **queue** | `createQueue(initial?)` | `{ items, add(), remove(), peek(), clear(), size }` | — |
| **set** | `createSet(initial?)` | `{ entries, add(), remove(), toggle(), has(), clear(), size }` | — |
| **toggle** | `createToggle(initial?)` | `Signal<boolean> & { toggle() }` | — |

---

## Timing

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **animation-frames** | `createAnimationFrames()` | `{ isRunning, delta, elapsed, start(), stop() } & Disposable` | — |
| **debounced** | `createDebounced(getter, delay)` | `Computed<T>` | — |
| **interval** | `createInterval(callback, delay)` | `{ isRunning, start(), stop(), reset() } & Disposable` | — |
| **raf** | `createRaf(callback)` | `{ isRunning, start(), stop() } & Disposable` | — |
| **throttled** | `createThrottled(getter, interval)` | `Computed<T>` | — |
| **timeout** | `createTimeout(callback, delay)` | `{ isPending, start(), stop(), reset() } & Disposable` | — |

---

## State Management

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **finite-state-machine** | `createFiniteStateMachine(initial, transitions, options?)` | `{ state, send(), can() }` | — |
| **persisted-state** | `createPersistedState(key, initialValue, storage?)` | `Signal<T>` | — |
| **previous** | `createPrevious(getter)` | `Computed<T \| undefined>` | — |
| **previous-distinct** | `createPreviousDistinct(getter, isEqual?)` | `Computed<T \| undefined>` | — |
| **state-history** | `createStateHistory(getter, capacity?)` | `{ history, index, canUndo, canRedo, undo(), redo(), clear() }` | — |
| **state-validator** | `createStateValidator(getter, validator)` | `{ errors, isValid }` | — |
| **watch** | `createWatch(source, callback)` | `() => void` (stop function) | — |

---

## Async

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **async-retry** | `createAsyncRetry(source, fetcher, options?)` | `{ data, loading, error, retry(), attempt }` | — |
| **resource** | `createResource(source, fetcher, options?)` | `{ data, loading, error, refetch() }` | — |

---

## React Integration

| Utility | Export | Description |
|---------|--------|-------------|
| **react** | `useSignal(value)` | Subscribes a React component to a signal/computed via `useSyncExternalStore`. |
| **react** | `useScope(callback)` | Creates an `effectScope` that lives for the component's lifetime. |

---

## Cleanup Convention

All helpers that allocate resources follow these patterns:

1. **`onCleanup`** — Every helper registers teardown with the current `effectScope`. When the scope disposes, all listeners/observers/timers are removed automatically.
2. **`Disposable`** — Helpers that return plain objects (not `Computed`/`Signal`) include `[Symbol.dispose]` for explicit teardown or `using` syntax.
3. **Scope-only cleanup** — Single-value helpers (returning `Computed<T>` or `Signal<T>`) rely solely on `onCleanup` — they do **not** implement `Disposable`, since mutating core signal types with `Symbol.dispose` would be unsafe.

When called inside an `effectScope`, cleanup happens automatically on scope disposal. For explicit teardown, dispose the scope itself (call the function returned by `effectScope`).
