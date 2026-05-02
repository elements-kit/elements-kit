# ARCHITECTURE.md

How **elements-kit** works. User-facing docs: [README.md](README.md). Contributor rules: [CONTRIBUTING.md](CONTRIBUTING.md). Doc-authoring rules: [DOCS.md](DOCS.md). Agent navigation: [AGENTS.md](AGENTS.md).

> Load-bearing. Any change to §3 (reactive model), §4 (JSX), §5 (custom elements), or §6 (cleanup) must land alongside the code change in the same PR.

## 1. Scope

**Is**: a toolkit of framework-agnostic reactive primitives based on signals, a zero-overhead JSX-to-DOM runtime, and decorators that enhance native custom elements.

**Is not**: a component framework, a VDOM renderer, an SSR/hydration system, a styling solution, or a router.

## 2. Public API surface

Each subpath is a stable import entry declared in [package.json](package.json) `exports`.

| Subpath | Exports | Stability |
|---------|---------|-----------|
| `elements-kit/for` | `For` — reactive keyed-list renderer | stable |
| `elements-kit/signals` | `signal`, `computed`, `effect`, `effectScope`, `batch`, `untracked`, `trigger`, `onCleanup`, `isSignal`, `isComputed`, `isEffect`, `isEffectScope`, `isReactive`, `resolve`, `reactive`, `@reactive`, brand symbols `SIGNAL` / `COMPUTED` / `EFFECT` / `EFFECT_SCOPE` (type-narrowing markers — not debug variants, no logging); types `Signal<T>`, `Computed<T>`, `MaybeReactive<T>` | stable |
| `elements-kit/attributes` | `@attributes`, `ATTRIBUTES`, `dispatchAttrChange`, `observedAttributes`; types `Attributes<T>`, `AttrChangeHandler<T>` | stable |
| `elements-kit/custom-elements` | `renderScope` — run setup in a detached `effectScope`, return `{ result, dispose }`. `connectedScope(el, setup)` / `disconnectedScope(el)` — convenience pair for `connectedCallback`/`disconnectedCallback` that stores the dispose handle per-element. | stable |
| `elements-kit/slot` | `Slot` | stable |
| `elements-kit/jsx-runtime` | `jsx`, `jsxs`, `jsxDEV`, `h`, `Fragment`; types `Child`, `Component`, `PropsTarget`, `ComponentFn`, `ComponentClass`, `ComponentInstance`; `JSX` namespace (`Element`, `ElementType`, `IntrinsicAttributes`, `IntrinsicElements`) | stable (JSX contract) |
| `elements-kit/integrations/react` | `useSignal`, `useScope` | stable |
| `elements-kit/utilities/*` | one primary export per module — mix of `createX` factories, verb/imperative functions (`on`, `onClickOutside`, `retry`, `async`, `promise`, `navigate`, `patchHistory`), and pre-instantiated singletons (`online`, `windowFocused`, `activeElement`, `currentLocation`). Async primitives: `async` / `Async` ([src/utilities/async.ts](src/utilities/async.ts)) and `promise` / `ReactivePromise` / `ComputedPromise` ([src/utilities/promise.ts](src/utilities/promise.ts)) | stable per module |

## 3. Reactive model

- **`signal<T>(value)`** — callable reader/writer. Reads inside reactive context subscribe. Writes notify synchronously.
- **`computed<T>(fn)`** — lazy, memoized. Recomputes on read only when a tracked dependency has changed. Disposes internal subscriptions when it has no subscribers.
- **`effect(fn)`** — eager. Runs immediately to collect deps, re-runs on every change. Returns stop function.
- **`effectScope(fn)`** — groups nested effects; stop function disposes all.
- **`batch(fn)`** — defers notifications until `fn` returns. Nested batches flush at outermost boundary.
- **`untracked(signal | fn)`** — reads without subscribing.
- **`trigger(signal)`** — manual notify for in-place mutations when the reference did not change.
- **`onCleanup(fn)`** — registers teardown in the current reactive context (`effect`, `effectScope`, or `computed`). Inside an effect/scope: runs before re-execution and on disposal. Inside a computed: runs before re-evaluation and when the last subscriber is released. Valid at any call depth.
- **`@reactive()`** — field decorator backing a class property with a `signal` transparently (no `()` at access sites).
- **`reactive(source?)`** — the decorator factory. Call with no args for a plain `@reactive()` signal-backed field. Pass `(self) => Signal<Value>` / `Computed<Value>` to back the field with a custom source — e.g. `@reactive((s) => computed(() => s.#items().length))` makes a read-only derived field. Computed-backed fields are non-writable; assignment throws.
- **`resolve<T>(value: MaybeReactive<T>): T`** — unwrap a `MaybeReactive<T>` (a value or a reactive reader). If reactive, calls it (tracking subscribes in the current context); else returns the value as-is. Use at API boundaries where callers may pass either a static value or a signal/computed.
- **`isReactive(value)`** — predicate: `isSignal(value) || isComputed(value)`.

**Equality**: identity comparison (`===`). Mutating without replacing the reference requires `trigger()`.

**Error handling**: exceptions thrown inside an effect bubble synchronously out of the write that triggered it. The library does not catch. A throwing cleanup does not block sibling cleanups — each `onCleanup` callback runs independently.

**Effect & notification ordering**:

- Writes notify synchronously in write order. Computeds re-evaluate lazily on the next read; effects re-run eagerly.
- Within a `batch`, all writes complete before any subscriber is notified. Nested batches flush at the outermost boundary.
- Writing a tracked signal inside its own effect re-schedules the effect; the engine prevents re-entry by flushing after the current run completes.
- Nested effects flush outer-first. Disposing an outer `effectScope` disposes all nested effects in registration order.

**Performance guarantees**:

- Signal read: O(1) (no allocation on steady-state reads).
- Signal write: O(subscribers) for notification scheduling.
- Computed read: O(1) when unchanged (cached); O(deps) when stale.
- `For` reconciliation: O(n + m) for array length n → m.

## 4. JSX contract

- Compiles to `document.createElement` + direct DOM mutations. No intermediate tree.
- **Live binding**: the accepted reactive shape is asymmetric.
  - **Children** accept `Signal<T>`, `Computed<T>`, or `() => T`. Each creates a live slot or text node that updates in place ([src/jsx-runtime/children.ts](src/jsx-runtime/children.ts)).
  - **Attributes / props** accept only `Signal<T>` or `Computed<T>` — anything that passes `isReactive`. A plain `() => T` is treated as a static value and never updates ([src/jsx-runtime/properties.ts](src/jsx-runtime/properties.ts)). To bind an expression to an attribute, wrap it in `computed(...)` or pass an existing `Signal`.
- **Prop namespaces**:
  - `on:event={fn}` — event listener (case-preserving; `on:click`, `on:MyCustomEvent`, etc.).
  - `class:name={bool | signal}` — reactive `classList.toggle`.
  - `style:prop={value | signal}` — reactive inline style property.
  - `prop:name={value}` — forces property assignment, bypasses `setAttribute`.
  - `ref={(el) => void | () => void}` — fires after the element is created and its props/children are attached, before it is inserted into its parent. Available on **every** JSX tag (intrinsic or component) via `JSX.IntrinsicAttributes`. The callback may return a cleanup function; cleanup runs when the surrounding reactive scope disposes.
- **Lists**: use `<For each by>` for keyed reconciliation. Plain array children render once.
- **Slots**: `slot:name={child}` assigns named slot content when mounting into custom-element hosts.
- **`jsxImportSource`**: `"elements-kit"` with `"jsx": "react-jsx"` in tsconfig.

**Edge cases**:

- **Attribute removal**: passing `null`, `undefined`, or `false` to a standard attribute removes it (`removeAttribute`). Passing `true` sets an empty string (boolean-attribute convention). Reactive values that transition to `null`/`undefined` remove the attribute on the next update.
- **`class:name={falsy}`** — removes the class. `true` / truthy adds it. Reactive bindings auto-toggle.
- **`style:prop={falsy}`** — setting `undefined` / `null` / `""` removes the inline style property. Reactive bindings clear on falsy transitions.
- **Event listeners** — attached via `addEventListener`; **not** removed on node removal; cleaned up when the enclosing `effectScope` disposes. Detached subtrees without a scope: call sites own cleanup.
- **Fragment (`<>...</>`)** — a `DocumentFragment` whose children are appended into the parent on insertion. Accepts the same child shapes as any other JSX container: Nodes, strings, numbers, arrays, and reactive getters (`() => T` become live slots). Fragment itself is empty after insertion (children move out); reactive children maintain live bindings against the parent post-move.
- **Import safety (Node)** — every module under `elements-kit/utilities/*` is import-safe in Node. Singletons that wrap browser APIs (`windowSize`, `online`, `windowFocused`, `activeElement`, `orientation`, `currentLocation`) return neutral values outside a browser: zeros, empty strings, `null`, or sensible defaults (`online` and `windowFocused` assume `true`; `orientation.type` defaults to `"portrait-primary"`). The JSX runtime and custom-element helpers touch the DOM only at call time, not at import. The shared `isBrowser` guard lives in [src/utilities/environment.ts](src/utilities/environment.ts). Full SSR rendering / hydration is not implemented — see §9.

## 5. Custom-element contract

- `@attributes` on a class wires a static `[ATTRIBUTES]` map into `observedAttributes` and `attributeChangedCallback`.
- Inheritance merges maps; subclass entries override. `observedAttributes(cls)` resolves the final set.
- `@reactive()` on instance fields backs them with signals; works in both plain classes and `HTMLElement` subclasses.
- No constructor-mounted rendering. Mount in `connectedCallback`, dispose in `disconnectedCallback`.
- Use `renderScope` from `elements-kit/custom-elements` to capture a scope at connect: it runs `setup` inside an `effectScope` detached from any enclosing effect and returns `{ result, dispose }`. Store `dispose` on the instance and call it from `disconnectedCallback`. Effects, `onCleanup` callbacks and reactive reads inside `setup` are bound to that scope.
- For the common case of "run setup on connect, dispose on disconnect", `connectedScope(this, setup)` + `disconnectedScope(this)` wrap `renderScope` and store the dispose handle per element — no instance field needed. Calling `connectedScope` twice on the same element disposes the previous scope first, so reconnect works correctly.

### 5a. Store pattern

- A **store** is any class whose fields are made reactive with `@reactive` (and optionally `computed`). No `render()`, no DOM.
- Stores hold shared state only. Subscribers (custom elements, React components, plain effects) observe the same instance and stay in sync.
- Store instances live for the lifetime the caller chooses — typically module-scope singletons or per-feature instances. The library does not own store lifetime.
- Writing a `@reactive` field triggers all readers synchronously; batching groups multiple writes.

### 5b. React integration

- **`useSignal(reader)`** — `reader` is a `Signal<T>`, `Computed<T>`, or `() => T`. Subscribes the React component via `useSyncExternalStore`. React re-renders only when the read value changes (identity comparison).
- **`useScope(callback)`** — creates an `effectScope` that lives for the React component's lifetime. The scope disposes on unmount; all effects registered inside it tear down automatically.
- Signals used purely inside JSX (outside React) do not cause React re-renders — they update the DOM directly. Only `useSignal` bridges a signal into React's render pipeline.
- React's StrictMode double-invocation of effects is handled: `useScope` constructs the scope inside a ref, so the second pass reuses it.

### 5c. `For` reconciliation

- Signature: `<For each={array | Signal<array>} by={(item, index) => key}>{(item, index) => child}</For>`.
- Keys must be unique within `each`. Duplicate keys produce undefined reordering.
- On array change: existing keys reuse their rendered nodes (no teardown, no recreate). New keys mount; missing keys unmount; moves reorder DOM in place.
- The render callback runs once per unique key inside its own `effectScope`. `onCleanup` callbacks and nested effects registered during render are bound to that per-item scope and fire when the item's key leaves `each` (or when the enclosing component unmounts).
- The render callback is **not** a reactive context for dependency tracking — read signals with `() => signal()` inside returned JSX if you want live bindings per row.
- Complexity: O(n + m) where n=old length, m=new length (udomdiff-style reconciliation).

### 5d. Slot semantics

- `Slot` reserves a DOM region with two comment-node markers. No wrapper element.
- `slot.set(content)` replaces current content; `slot.clear()` removes it; `slot.get()` returns the current content.
- Content passed before mount is buffered and flushed on `connect()`.
- `Slot` implements `Symbol.dispose` — disposing removes the markers and clears content.
- Named slots in JSX (`slot:name={child}`) are resolved against host elements that expose matching `Slot` instances.

### 5e. Attribute reflection

- Values in `[ATTRIBUTES]` handlers receive the raw string (or `null` when removed) from `attributeChangedCallback`. Typed conversion (`Number(value)`, `JSON.parse(value)`, etc.) is the handler's responsibility — no auto-coercion.
- Property-to-attribute reflection is **not** automatic. Writing `element.count = 5` does not update the `count` attribute; if reflection is desired, the class implements it explicitly (usually via an `effect` inside `connectedCallback`).
- Inheritance: `observedAttributes(cls)` walks the prototype chain and merges each `[ATTRIBUTES]` map. Subclass keys override base-class keys of the same name.

## 6. Cleanup convention

1. Every helper that allocates a resource registers teardown via `onCleanup`. Works inside any reactive context (`effect`, `effectScope`, or `computed`).
2. Helpers returning composite objects implement `[Symbol.dispose]` for explicit / `using` teardown.
3. Helpers returning raw `Signal<T>` / `Computed<T>` rely **only** on `onCleanup`. Core reactive types must not carry `Symbol.dispose`.
4. When no enclosing `effectScope` exists, cleanup is the caller's responsibility via the disposer returned by `effectScope` or by explicitly disposing the `Disposable`.

### 6a. Scope contract at element boundaries

`onCleanup` only registers when called inside a reactive context. The JSX runtime wraps most element-creation paths in an `effectScope` automatically — the table below is the contract users can rely on when deciding where to place effects and cleanup.

| Boundary | Auto-scoped? | Disposed when |
|----------|--------------|---------------|
| Function component body (`(props) => <el/>`) | ✓ — inside `createElement` | The returned element is disposed (via `disposeElement` or an enclosing scope teardown). |
| Intrinsic / class element (`<div/>`, `<MyClass/>`) | ✓ — inside `createElement` | Same as above. |
| Fragment (`<>...</>`) | ✓ — via the surrounding `createElement` call the JSX transform emits | The fragment's disposables fire through the enclosing scope. |
| Per-child and reactive-child slots (e.g. `{() => signal()}`) | ✓ — each slot owns a scope | The slot is replaced or its parent is disposed. |
| `<For>` render callback (per item) | ✓ — per-entry scope | The item's key leaves `each`, or the list unmounts. |
| Custom element `connectedCallback` | ✗ by default — opt in with `renderScope` | `dispose()` is called (typically from `disconnectedCallback`). |
| Direct calls to `Fragment({ children })` (non-JSX) | ✗ | Caller owns the scope. |

Effects created outside an auto-scoped boundary leak unless the caller captures and disposes an `effectScope` manually (or uses `renderScope`).

Full dependency and returns matrix: [src/utilities/README.md](src/utilities/README.md).

## 7. Browser support

- Evergreen browsers with native Custom Elements v1, ES2022, and `ResizeObserver` / `IntersectionObserver` / `MutationObserver`.
- [src/polyfill.ts](src/polyfill.ts) shims `Symbol.dispose` for runtimes that don't yet implement it. Import once at entry. No other polyfills shipped — consumers who need `URLPattern` (used by [src/utilities/routing.ts](src/utilities/routing.ts)) must bring their own (e.g. `urlpattern-polyfill`).
- No IE or legacy Edge support.

## 8. Security

- JSX prop namespaces write raw values: `prop:`, `style:`, and attribute bindings set the given value directly on the node. Callers are responsible for sanitizing untrusted input.
- The JSX runtime has no `innerHTML` sink. Children are appended as DOM nodes or text nodes — strings become text, never markup.
- Event handlers are attached via `addEventListener`. No `javascript:` URL evaluation and no `eval`/`Function` constructors in the runtime.
- Signals and stores do not serialize. Consumers persisting state (e.g. via `createLocalStorage`) own the serialization boundary.

## 9. Non-goals

- Server-side rendering and hydration — not implemented today. Imports are Node-safe (see §4) so bundlers don't crash, but runtime behavior is DOM-only.
- Virtual-DOM diffing.
- Styling primitives (CSS-in-JS, theme system).
- Application-level routing (a `url-pattern` matcher utility exists; composition into a router is out of scope).
- State management abstractions beyond signals + stores.

## 10. Glossary

- **Signal** — reactive container for a single value. Reads subscribe, writes notify. Callable reader/writer.
- **Computed** — lazy, cached derivation over signals. Callable read-only.
- **Effect** — eager side effect that tracks its signal reads and re-runs on change.
- **Effect scope** — a group of effects sharing a single disposer; lifetime parent for nested effects and `onCleanup` handlers.
- **Store** — class holding reactive fields (`@reactive`). State only; no DOM.
- **Component** — class with a `render()` method returning an `Element`.
- **Custom element** — `HTMLElement` subclass, optionally enhanced with `@attributes` and `@reactive`.
- **Slot** — comment-marker DOM region managed by the `Slot` class.
- **Live binding** — DOM node (text or attribute) whose value tracks a signal/computed without re-rendering the surrounding tree.
- **Brand symbol** — `Symbol()` key stamped on a function (`SIGNAL`, `COMPUTED`, `EFFECT`, `EFFECT_SCOPE`) so `isSignal` / `isComputed` / `isEffect` / `isEffectScope` can narrow types by identity, not shape.
