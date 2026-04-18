# Utilities

Reactive utilities built on top of the core signal primitives (`signal`, `computed`, `effect`, `effectScope`, `onCleanup`, `trigger`, `batch`, `untracked`).

See [root README](../../README.md) for library overview and [SPEC.md](../../SPEC.md) for the cleanup convention, quality bars, and module-dependency rules that apply to every helper listed below.

> ⚠️ **This catalog is under audit.** Export names in the tables below may lag the source. Treat the files in this directory as the source of truth; open an issue or PR when you spot drift. Known-correct corrections already applied: `on` (not `createEventListener`), `onClickOutside`, `createFocusWithin`, `activeElement` (singleton), `createSearchParam`, `online` / `createOnline`.

---

## Dependency Graph

```text
Core Primitives (signal, computed, effect, onCleanup, trigger …)
├── event-listener.ts ─── createEventListener
│   ├── before-unload.ts
│   ├── draggable.ts
│   ├── drop-zone.ts
│   ├── element-scroll.ts
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
│   ├── focus-trap.ts
│   ├── on-click-outside.ts
│   ├── page-leave.ts
│   ├── pressed-keys.ts
│   ├── scroll-state.ts
│   ├── scrolling.ts
│   ├── search-params.ts
│   ├── start-typing.ts
│   ├── swipe.ts
│   └── text-selection.ts
│
├── event-driven.ts ─── fromEvent / sync
│   ├── active-element.ts
│   ├── fullscreen.ts
│   ├── hash.ts
│   ├── media.ts
│   ├── media-player.ts (+ createAudio / createVideo aliases)
│   ├── orientation.ts
│   └── window-size.ts
│
├── resize-observer.ts ─── createResizeObserver
│   ├── element-rect.ts
│   └── element-size.ts
│
├── intersection-observer.ts ─── createIntersectionObserver
│   ├── element-visibility.ts
│   ├── infinite-scroll.ts
│   └── is-in-viewport.ts
│
└── (standalone — no lib/ dependencies)
    ├── animation-frames.ts
    ├── async-retry.ts
    ├── async-state.ts
    ├── broadcast-channel.ts
    ├── clipboard.ts
    ├── css-var.ts
    ├── debounced.ts
    ├── document-title.ts
    ├── event-source.ts
    ├── eye-dropper.ts
    ├── favicon.ts
    ├── finite-state-machine.ts
    ├── geolocation.ts
    ├── interval.ts
    ├── list.ts
    ├── lock-body-scroll.ts
    ├── map.ts
    ├── memo.ts
    ├── mutation-observer.ts
    ├── permission.ts
    ├── previous.ts
    ├── queue.ts
    ├── raf.ts
    ├── resource.ts
    ├── set.ts
    ├── share.ts
    ├── state-history.ts
    ├── state-validator.ts
    ├── throttled.ts
    ├── timeout.ts
    ├── timestamp.ts
    ├── wake-lock.ts
    ├── web-notification.ts
    ├── web-socket.ts
    ├── watch.ts
    └── storage.ts (+ createLocalStorage / createSessionStorage)
```

---

## Core Utilities

These are the foundational building blocks used by many other helpers.

| Utility | Export | Description |
|---------|--------|-------------|
| **event-listener** | `on(target, type, handler, options?)` | Attaches a type-safe event listener with auto-cleanup via `onCleanup`. Supports reactive getter targets (re-registers when target changes). |
| **event-driven** | `Subscribe`, `fromEvent(target, events)`, `sync(subscribe, getter, setter?)` | Declarative DOM-state-to-signal bridge. `fromEvent` creates a `Subscribe` for DOM events; `sync` keeps a `Computed` (or writable `Signal` with setter) in sync with an external source. |
| **resize-observer** | `createResizeObserver(target, callback)` | Wraps `ResizeObserver` with auto-cleanup via `onCleanup`. |
| **intersection-observer** | `createIntersectionObserver(target, callback, options?)` | Wraps `IntersectionObserver` with auto-cleanup via `onCleanup`. |
| **mutation-observer** | `createMutationObserver(target, options, callback)` | Wraps `MutationObserver` with auto-cleanup via `onCleanup`. |

### When to use which

- **`sync` + `fromEvent`** — When you want to read DOM state on events (getter pattern). The signal is a lazy `computed` that re-reads the getter when events fire.
- **`on`** — When you need the event object itself (e.g. `e.clientX`, `e.key`) or need listener options like `{ passive: true }`.

---

## DOM Events

Helpers that track DOM event-driven state.

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **active-element** | `activeElement` (singleton `Computed<Element \| null>`) | `Computed<Element \| null>` | `event-driven` |
| **hover** | `createHover(target)` | `Computed<boolean>` | `event-listener` |
| **focus-within** | `createFocusWithin(target)` | `Computed<boolean>` | `event-listener` |
| **key-press** | `createKeyPress(key)` | `{ pressed: Computed<boolean> } & Disposable` | `event-listener` |
| **long-press** | `createLongPress(target, handler, options?)` | `Disposable` | `event-listener` |
| **mouse-position** | `createMousePosition()` | `{ x, y: Computed<number> } & Disposable` | `event-listener` |
| **mouse-wheel** | `createMouseWheel()` | `Computed<number>` | `event-listener` |
| **on-click-outside** | `onClickOutside(target, handler)` | `void` | `event-listener` |
| **pressed-keys** | `createPressedKeys()` | `Computed<ReadonlySet<string>>` | `event-listener` |
| **draggable** | `createDraggable(target)` | `{ x, y, isDragging } & Disposable` | `event-listener` |
| **drop-zone** | `createDropZone(target, onDrop?)` | `{ isOver, files } & Disposable` | `event-listener` |
| **start-typing** | `createStartTyping(handler, idleMs?)` | `Disposable` | `event-listener` |
| **focus-trap** | `createFocusTrap(target)` | `Disposable` | `event-listener` |
| **swipe** | `createSwipe(target?, threshold?)` | `{ direction, isSwiping, deltaX, deltaY } & Disposable` | `event-listener` |
| **text-selection** | `createTextSelection()` | `{ text, ranges }` | `event-listener` |

---

## Browser APIs

Helpers that wrap browser APIs as reactive signals.

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **broadcast-channel** | `createBroadcastChannel<T>(name)` | `{ data, post() } & Disposable` | — |
| **clipboard** | `createClipboard(resetDelay?)` | `{ copied, value, copy() }` | — |
| **css-var** | `createCSSVar(name, initialValue?, target?)` | `Signal<string>` | — |
| **event-source** | `createEventSource<T>(url, options?)` | `{ data, event, lastEventId, status, error, close } & Disposable` | — |
| **eye-dropper** | `createEyeDropper()` | `{ isSupported, color, open() }` | — |
| **fullscreen** | `createFullscreen(target?)` | `{ isFullscreen, enter(), exit(), toggle() } & Disposable` | `event-driven` |
| **geolocation** | `createGeolocation(options?)` | `{ position, error, loading } & Disposable` | — |
| **hash** | `createHash()` | `Signal<string>` | `event-driven` |
| **lock-body-scroll** | `createLockBodyScroll()` | `Disposable` | — |
| **media** | `createMediaQuery(query, defaultState?)` | `Computed<boolean>` | `event-driven` |
| **media-devices** | `createMediaDevices()` | `Computed<MediaDeviceInfo[]>` | `event-listener` |
| **motion** | `createMotion()` | `{ acceleration, rotationRate, interval, … } & Disposable` | `event-listener` |
| **network** | `online` (singleton `Computed<boolean>`), `createOnline()` | `Computed<boolean>` | `event-listener` |
| **orientation** | `createOrientation()` | `{ angle, type } & Disposable` | `event-driven` |
| **permission** | `createPermission(descriptor)` | `{ state } & Disposable` | — |
| **url-pattern** | `createURLPattern(source, input?, options?)` | `Computed<URLPatternResult \| null>` | — |
| **search-params** | `createSearchParam(key)` | `Computed<string \| null>` | `event-listener` |
| **share** | `createShare()` | `{ isSupported, isSharing, share() }` | — |
| **wake-lock** | `createWakeLock()` | `{ isActive, isSupported, request(), release() } & Disposable` | — |
| **web-notification** | `createWebNotification()` | `{ permission, isSupported, requestPermission(), notify() }` | — |
| **web-socket** | `createWebSocket<T>(url, options?)` | `{ data, status, send, close, open } & Disposable` | — |
| **window-size** | `createWindowSize()` | `{ width, height } & Disposable` | `event-driven` |

---

## Element Observation

Helpers that observe element properties using browser observers.

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **element-rect** | `createElementRect(target)` | `{ x, y, width, height, top, right, bottom, left } & Disposable` | `resize-observer` |
| **element-size** | `createElementSize(target)` | `{ width, height } & Disposable` | `resize-observer` |
| **element-visibility** | `createElementVisibility(target, options?)` | `Computed<number>` (0–1 ratio) | `intersection-observer` |
| **is-in-viewport** | `createIsInViewport(target, options?)` | `Computed<boolean>` | `intersection-observer` |

---

## Media Elements

Reactive wrappers for `<audio>` and `<video>` elements.

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **media-player** | `createMediaPlayer(element)` | `{ element, playing, muted, volume, duration, time, ended, play(), pause(), toggle() } & Disposable` | `event-driven` |

`createAudio` and `createVideo` are deprecated aliases for `createMediaPlayer`.

`muted`, `volume`, and `time` are writable `Signal<T>` — writing them updates the underlying element. `playing`, `duration`, and `ended` are read-only `Computed<T>`.

---

## Scrolling

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **element-scroll** | `createElementScroll(target)` | `{ x: Signal, y: Signal } & Disposable` | `event-listener` |
| **infinite-scroll** | `createInfiniteScroll(sentinel, handler, options?)` | `Disposable` | `intersection-observer` |
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
| **list** | `createList(initial?)` | `{ items, push(), pop(), remove(), filter(), set(), clear(), size }` | — |
| **map** | `createMap(initial?)` | `{ entries, get(), set(), delete(), has(), clear(), size }` | — |
| **queue** | `createQueue(initial?)` | `{ items, add(), remove(), peek(), clear(), size }` | — |
| **set** | `createSet(initial?)` | `{ entries, add(), remove(), toggle(), has(), clear(), size }` | — |

---

## Timing

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **animation-frames** | `createAnimationFrames()` | `{ pending, delta, elapsed, start(), stop() } & Disposable` | — |
| **debounced** | `createDebounced(getter, delay)` | `Computed<T>` | — |
| **interval** | `createInterval(callback, delay)` | `{ pending, start(), stop(), reset() } & Disposable` | — |
| **raf** | `createRaf(callback)` | `{ pending, start(), stop() } & Disposable` | — |
| **throttled** | `createThrottled(getter, interval)` | `Computed<T>` | — |
| **timeout** | `createTimeout(callback, delay)` | `{ isPending, start(), stop(), reset() } & Disposable` | — |
| **timestamp** | `createTimestamp()` | `Computed<number>` | — |

---

## State Management

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **finite-state-machine** | `createFiniteStateMachine(initial, transitions, options?)` | `{ state, send(), can() }` | — |
| **storage** | `createLocalStorage(key, initialValue, options?)` | `Signal<T>` | `event-listener` |
| **storage** | `createSessionStorage(key, initialValue, options?)` | `Signal<T>` | — |
| **previous** | `createPrevious(getter, isEqual?)` | `Computed<T \| undefined>` | — |
| **state-history** | `createStateHistory(getter, capacity?)` | `{ history, index, canUndo, canRedo, undo(), redo(), clear() }` | — |
| **state-validator** | `createStateValidator(getter, validator)` | `{ errors, isValid }` | — |
| **memo** | `createMemo(fn, keyFn?)` | `{ call(), result, clear() }` | — |
| **watch** | `createWatch(source, callback)` | `() => void` (stop function) | — |

---

## Async

| Utility | Export | Returns | Dependencies |
|---------|--------|---------|-------------|
| **async-retry** | `createAsyncRetry(source, fetcher, options?)` | `{ data, loading, error, retry(), attempt }` | — |
| **async-state** | `createAsyncState(producer, options?)` | `{ data, loading, error, execute() }` | — |
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

---

## TODO — catalog audit

Pending work before removing the banner at the top:

- Audit remaining rows against `src/utilities/*.ts` and update return-type / signature drift.
- Add missing entries for: `retry` (`retry.ts`), `async` + `Async` (`async.ts`), `promise` + `ReactivePromise` (`promise.ts`), `routing` (`patchHistory`, `navigate`, `matches`, `match`, `isLocalNavigationEvent`), `location` (`createLocation` + `currentLocation` singleton), `window-focus` (`windowFocused` singleton + `createWindowFocused`).
- Mark singletons explicitly where applicable (`windowSize`, `orientation`, `currentLocation`, etc.).
- Verify every entry in the dependency graph matches an actual file.
