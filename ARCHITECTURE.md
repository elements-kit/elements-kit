# ARCHITECTURE.md

How **elements-kit** works. User-facing docs: [README.md](README.md). Contributor rules: [CONTRIBUTING.md](CONTRIBUTING.md). Doc-authoring rules: [DOCS.md](DOCS.md). Agent navigation: [AGENTS.md](AGENTS.md).

> Load-bearing. Any change to §3 (reactive model), §4 (JSX), §5 (custom elements), or §6 (cleanup) must land alongside the code change in the same PR.

## 1. Scope

**Is**: framework-agnostic reactive primitives, a zero-overhead JSX-to-DOM runtime, decorators that enhance native custom elements, and an experimental streaming server renderer + hydration pass (§11).

**Is not**: component framework, VDOM renderer, styling solution, router.

## 2. Public API surface

Each subpath is a stable import entry declared in [package.json](package.json) `exports`.

| Subpath | Exports | Stability |
|---------|---------|-----------|
| `elements-kit/for` | `For` — reactive keyed-list renderer | stable |
| `elements-kit/signals` | Factories: `signal`, `computed`, `effect`, `effectScope`, `reactive`, `@reactive`. Helpers: `batch`, `untracked`, `trigger`, `onCleanup`, `resolve`. Predicates: `isSignal`, `isComputed`, `isEffect`, `isEffectScope`, `isReactive`. Brand symbols `SIGNAL` / `COMPUTED` / `EFFECT` / `EFFECT_SCOPE` — type-narrowing markers, not debug variants, no logging. Types: `Signal<T>`, `Computed<T>`, `MaybeReactive<T>`. | stable |
| `elements-kit/attributes` | `@attributes`, `ATTRIBUTES`, `dispatchAttrChange`, `observedAttributes`; types `Attributes<T>`, `AttrChangeHandler<T>` | stable |
| `elements-kit/custom-elements` | `defineElement` — strict registration with typed JSX via `CustomElementRegistry` augmentation; types `CustomElementRegistry`, `PublicPropKeys`, and the raw framework-agnostic extractors `PropertiesOf` / `AttributesOf` / `EventsOf`. | stable |
| `elements-kit/slot` | `Slot` class, `@slot()` decorator, `SlotContent` type | stable |
| `elements-kit/jsx-runtime` | `jsx`, `jsxs`, `jsxDEV`, `h`, `Fragment`; types `Children`, `PropsOf`, `RawProps`, `Props`, `Require`, `MaybeReactiveProps`, `MaybeReactive`, `ComponentFn`, `ComponentClass`; `JSX` namespace (`Element`, `ElementClass`, `ElementType`, `IntrinsicAttributes`, `IntrinsicElements`) | stable (JSX contract) |
| `elements-kit/integrations/react` | `useSignal`, `useScope` | stable |
| `elements-kit/server` | `renderToStream`, `renderToString` — streaming HTML rendering, no DOM required (§11) | experimental |
| `elements-kit/hydrate` | `hydrate` — claim-mode adoption of server-rendered DOM (§11) | experimental |
| `elements-kit/await` | `Await` — loading boundary (Suspense equivalent) over the §11 async machinery; code splitting = `async` + dynamic import | experimental |
| `elements-kit/integrations/astro` | `elementsKit()` — Astro integration packaging the §11 renderer pair as an island framework (`astro-server` / `astro-client` entrypoints) | experimental |
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
- **`reactive(source?)`** — decorator factory. No args = plain signal-backed field. Pass `(self) => Signal<Value> | Computed<Value>` for a custom source, e.g. `@reactive((s) => computed(() => s.#items().length))` for a read-only derived field. Computed-backed fields are non-writable; assignment throws.
- **`resolve<T>(value: MaybeReactive<T>): T`** — unwrap a value-or-reader. Calls it if reactive (subscribing in the current context); returns as-is otherwise. Use at API boundaries that accept either shape.
- **`isReactive(value)`** — predicate: `isSignal(value) || isComputed(value)`.

**Equality**: identity comparison (`===`). Mutating without replacing the reference requires `trigger()`.

**Error handling**: exceptions thrown inside an effect bubble synchronously out of the write that triggered it. The library does not catch. A throwing cleanup does not block sibling cleanups — each `onCleanup` callback runs independently.

**Effect & notification ordering**:

- Writes notify synchronously in write order. Computeds re-evaluate lazily on the next read; effects re-run eagerly.
- Within a `batch`, all writes complete before any subscriber is notified. Nested batches flush at the outermost boundary.
- Writing a tracked signal inside its own effect re-schedules the effect; the engine prevents re-entry by flushing after the current run completes.
- Nested effects flush outer-first. Disposing an outer `effectScope` disposes all nested effects in registration order.

**Performance guarantees**:

- Signal read: O(1), no allocation on steady-state.
- Computed read: O(1) cached; O(deps) when stale.
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
  - `ref={(el) => void | () => void}` — fires after props/children attach, before insertion into the parent. Declared per-tag on every intrinsic element and registered custom element (`JSX.IntrinsicAttributes` is empty); components opt in by declaring `ref` themselves. May return a cleanup function; cleanup runs when the surrounding scope disposes.
- **Lists**: use `<For each by>` for keyed reconciliation. Plain array children render once.
- **Slots**: named slots are plain properties on the host — elements-kit JSX assigns them like any prop (`header={child}`), placing `{this.header}` in the template. The `@slot()` decorator backs a property with a `Slot` for imperative/vanilla consumers filling from outside elements-kit JSX.
- **`jsxImportSource`**: `"elements-kit"` with `"jsx": "react-jsx"` in tsconfig.

**Edge cases**:

- **Falsy semantics** — `null` / `undefined` / `false` on a standard attribute calls `removeAttribute`; `true` sets an empty string. `class:name={falsy}` removes the class, truthy adds it. `style:prop={falsy}` removes the inline style property. Reactive bindings auto-update on transition.
- **Event listeners** — attached via `addEventListener`; **not** removed on node removal; cleaned up when the enclosing `effectScope` disposes. Detached subtrees without a scope: call sites own cleanup.
- **Fragment (`<>...</>`)** — a `DocumentFragment` whose children are appended into the parent on insertion. Accepts the same child shapes as any other JSX container; reactive children maintain live bindings against the parent post-move.
- **Import safety (Node)** — every `elements-kit/utilities/*` module is import-safe in Node. Browser-API singletons (`windowSize`, `online`, `windowFocused`, `activeElement`, `orientation`, `currentLocation`) return neutral values outside a browser — zeros, empty strings, `null`, or sensible defaults (`online`/`windowFocused` assume `true`; `orientation.type` defaults to `"portrait-primary"`). JSX runtime and custom-element helpers touch the DOM only at call time. Shared `isBrowser` guard: [src/utilities/environment.ts](src/utilities/environment.ts). Server rendering and hydration: §11.

## 5. Custom-element contract

- `@attributes` on a class wires a static `[ATTRIBUTES]` map into `observedAttributes` and `attributeChangedCallback`.
- Inheritance merges maps; subclass entries override. `observedAttributes(cls)` resolves the final set.
- `@reactive()` on instance fields backs them with signals; works in both plain classes and `HTMLElement` subclasses.
- No constructor-mounted rendering. Mount in `connectedCallback`, dispose in `disconnectedCallback`.
- `render(target, setup)` (`elements-kit/render`) runs `setup` inside a detached `effectScope`, appends the returned node to `target`, and returns an `unmount` thunk. Effects, `onCleanup` callbacks and reactive reads inside `setup` bind to that scope. Store the thunk on the instance; call it from `disconnectedCallback` to remove the node, run its `Symbol.dispose` hook, and tear down every registered effect.

### 5a. Store pattern

- A **store** is a class with `@reactive` (and optionally `computed`) fields — no `render()`, no DOM. Subscribers (custom elements, React components, effects) share the instance and stay in sync.
- Caller owns lifetime — typically module-scope singletons or per-feature instances. Writes fire readers synchronously; group with `batch`.

### 5b. React integration

- **`useSignal(reader)`** — `reader` is `Signal<T>`, `Computed<T>`, or `() => T`. Subscribes via `useSyncExternalStore`; re-renders on identity change.
- **`useScope(callback)`** — `effectScope` tied to component lifetime; disposes on unmount. StrictMode-safe: scope is held in a ref, second pass reuses it.
- Signals used purely in JSX (outside React) update the DOM directly and do not cause React re-renders. Only `useSignal` bridges into React's render pipeline.

### 5c. `For` reconciliation

- Signature: `<For each={array | Signal<array>} by={(item, index) => key}>{(item, index) => child}</For>`.
- Keys must be unique. Duplicates produce undefined reordering.
- On change: existing keys reuse their nodes (no teardown). New keys mount, missing keys unmount, moves reorder in place.
- Render callback runs once per key inside its own `effectScope`; `onCleanup` and nested effects fire when the key leaves `each` or the list unmounts.
- The render callback is **not** a tracking context — wrap reactive reads in `() => signal()` inside returned JSX for per-row live bindings.
- Complexity: O(n + m), udomdiff-style.

### 5d. Slot semantics

- `Slot` reserves a DOM region with two comment-node markers. No wrapper element.
- `slot.get(...content)` mounts the markers and returns the region as a fragment (optional default content); `slot.current()` extracts and returns the current content; `slot.set(...content)` replaces it; `slot.clear()` removes it. Content follows native `append()` semantics (`Node` or string).
- Content passed to `set()` before mount is buffered and flushed on the first `get()`.
- `clear()` disposes reactive children (their `Symbol.dispose`) before removing them.
- The `@slot()` field decorator exposes a `Slot` as a plain property: reading places the region, assigning fills it (`null` clears). For imperative/vanilla consumers filling a custom element's slots from outside elements-kit JSX.

### 5e. Attribute reflection

- `[ATTRIBUTES]` handlers receive raw strings (or `null` when removed) from `attributeChangedCallback`. Typed conversion (`Number`, `JSON.parse`, etc.) is the handler's responsibility — no auto-coercion.
- Property-to-attribute reflection is **not** automatic. `element.count = 5` does not update the `count` attribute; implement reflection explicitly (usually via an `effect` in `connectedCallback`).
- Inheritance: `observedAttributes(cls)` walks the prototype chain and merges each `[ATTRIBUTES]` map. Subclass keys override base-class keys.

## 6. Cleanup convention

1. Helpers that allocate a resource register teardown via `onCleanup` (works inside `effect` / `effectScope` / `computed`).
2. Helpers returning composite objects implement `[Symbol.dispose]` for explicit / `using` teardown. Helpers returning raw `Signal<T>` / `Computed<T>` rely **only** on `onCleanup` — core reactive types must not carry `Symbol.dispose`.
3. When no enclosing `effectScope` exists, the caller owns cleanup via the `effectScope` disposer or by explicitly disposing the `Disposable`.
4. **Disposal order is LIFO, depth-first reverse.** When an effect or scope tears down, its child effects and scopes dispose **before** the parent's own `onCleanup` callbacks fire, and siblings dispose in **reverse creation order**. The same order applies on effect re-run: previous-run cleanups fire deepest-first, then the body re-executes. Helpers can rely on this when ordering resource release (a child observing a resource its parent owns can safely use the parent's state in its cleanup).

### 6a. Scope contract at element boundaries

`onCleanup` only registers inside a reactive context. The JSX runtime auto-wraps most element-creation paths in an `effectScope`. Contract:

| Boundary | Auto-scoped? | Disposed when |
|----------|--------------|---------------|
| Function component body (`(props) => <el/>`) | ✓ — inside `createElement` | The returned element is disposed (via `disposeElement` or an enclosing scope teardown). |
| Intrinsic / class element (`<div/>`, `<MyClass/>`) | ✓ — inside `createElement` | Same as above. |
| Fragment (`<>...</>`) | ✓ — via the surrounding `createElement` call the JSX transform emits | The fragment's disposables fire through the enclosing scope. |
| Per-child and reactive-child slots (e.g. `{() => signal()}`) | ✓ — each slot owns a scope | The slot is replaced or its parent is disposed. |
| `<For>` render callback (per item) | ✓ — per-entry scope | The item's key leaves `each`, or the list unmounts. |
| Custom element `connectedCallback` | ✗ by default — opt in with `render(this, setup)` | The `unmount` thunk is called (typically from `disconnectedCallback`). |
| Direct calls to `Fragment({ children })` (non-JSX) | ✗ | Caller owns the scope. |

Effects created outside an auto-scoped boundary leak unless the caller captures and disposes an `effectScope` manually (or uses `render`).

Full dependency and returns matrix: [src/utilities/README.md](src/utilities/README.md).

## 7. Browser support

- Evergreen browsers: Custom Elements v1, ES2022, `ResizeObserver` / `IntersectionObserver` / `MutationObserver`.
- [src/polyfill.ts](src/polyfill.ts) shims `Symbol.dispose`. Import once at entry. Consumers needing `URLPattern` (used by [src/utilities/routing.ts](src/utilities/routing.ts)) bring their own (e.g. `urlpattern-polyfill`).
- No IE or legacy Edge support.

## 8. Security

- JSX prop namespaces (`prop:`, `style:`, attributes) write raw values directly. Sanitize untrusted input at the call site.
- One deliberate raw-HTML sink: `<Fragment html>{MaybeReactive<string>}</Fragment>` — the Astro slot mapping composes it too. Parsing is script-inert — `<script>` never executes — but attribute-based XSS is the caller's to sanitize. Everywhere else strings become text, never markup, and the `innerHTML` prop throws in server rendering and hydration.
- Handlers attached via `addEventListener`. No `javascript:` URL evaluation, no `eval`/`Function` in the runtime.
- Signals and stores do not serialize. Consumers persisting state (e.g. `createLocalStorage`) own the serialization boundary.

## 9. Non-goals

- Compiler-based resumability (Qwik-style closure serialization). Hydration re-executes component code (§11); zero-JS interactivity is out of scope.
- Declarative Shadow DOM / custom-element server rendering (may follow as a later block on the §11 marker format).
- Out-of-order (Suspense-style) streaming; §11 streams in document order.
- Virtual-DOM diffing.
- Styling primitives (CSS-in-JS, theme system).
- Application routing — a `url-pattern` matcher exists; composition into a router is out of scope.
- State management beyond signals + stores.

## 10. Glossary

Canonical definitions in §3. Quick references:

- **Signal** — callable reactive container; reads subscribe, writes notify.
- **Computed** — callable read-only, lazy + cached derivation.
- **Effect** — eager tracking side effect; re-runs on change.
- **Effect scope** — group disposer; lifetime parent for nested effects and `onCleanup`.
- **Store** — class of `@reactive` fields. State only, no DOM.
- **Component** — class with `render()` returning an `Element`.
- **Custom element** — `HTMLElement` subclass, optionally with `@attributes` / `@reactive`.
- **Slot** — comment-marker DOM region managed by the `Slot` class.
- **Live binding** — text or attribute that tracks a signal/computed without re-rendering its surroundings.
- **Brand symbol** — `Symbol()` stamped on a function so `isSignal` / `isComputed` / `isEffect` / `isEffectScope` narrow by identity, not shape.

## 11. Server rendering & hydration (experimental)

Two subpaths: `elements-kit/server` ([src/server/](src/server/)) and `elements-kit/hydrate` ([src/hydrate/](src/hydrate/)). No compiler — the same runtime JSX drives three renderers, dispatched through a single check in `createElement` ([src/jsx-runtime/renderer.ts](src/jsx-runtime/renderer.ts)): default DOM, server string emission, hydrate claim mode. Server code never reaches client bundles; each subpath tree-shakes independently.

**Server render is a one-shot snapshot.** `renderToStream(() => <App/>)` / `renderToString(() => <App/>)` take a **thunk** (JSX evaluates eagerly — the renderer must install first). Signal/computed reads unwrap once via `untracked`; **effects do not run** (`effect()` is inert during server render); `on:` handlers and `ref` are skipped; `innerHTML` throws. Runs in any JS runtime — Node, edge/Workers — no DOM, no shims.

**Streaming is in-order.** HTML preceding an async insertion point (`promise` / `async` reactive values as children) flushes immediately; the stream awaits the value, emits it, continues. Resolved values serialize into `<script type="application/json" id="ek-data">` (render-order ids) at stream end. Rejections abort the stream — no swallowing.

**Marker contract.** The server emits the client runtime's own comment markers: dynamic children as `<!--{-->…<!--}-->` (Slot pairs, §5d) and lists as `<!--<For>-->` / `<!--[key]-->…<!--[/key]-->` / `<!--</For>-->` (§5c). These markers are how the claim pass locates live-binding boundaries.

**Hydration re-executes, then claims.** `hydrate(container, () => <App/>)` runs the component tree in claim mode: jsx calls produce descriptors (JSX evaluates children-first, so DOM walking is deferred), then a top-down walk adopts existing nodes — static elements/text keep identity, `on:` handlers attach, reactive props re-apply through `applyProps`, dynamic children bind live Slots to the claimed markers, `For` adopts per-key entry ranges (`For.hydrateRange`). Closures are recreated by re-execution — nothing is deserialized. Returns `{ dispose }`; teardown follows §6.

- **Mismatch**: the affected subtree renders fresh and replaces the server node; `options.onMismatch` reports it (no `console.*` in src/).
- **Async children**: pending `promise`/`async` instances are **seeded** from ek-data (walk-order ids match the server's emit-order ids) — the serialized value shows immediately and the instance's own settlement overwrites it (stale-while-revalidate). Without ek-data, server content stays visible until the client value settles.
- **Fetch skipping**: `Async.run()` calls during hydrate evaluation are deferred; the claim walk discards them for seeded instances — the fetcher never executes. Unseeded or unclaimed deferred runs execute after the walk. `promise(fetch(...))` cannot skip (the promise fires before the library sees it) and `Async.start()` always executes (reactive re-runs need dependency collection). On the server, `run()` executes directly despite inert effects so the stream can await it.
- **Determinism constraint**: server and client must execute the same tree. Browser-only branches that change structure before hydration cause mismatches (safe fallback: fresh render of that subtree).
- **v1 excludes**: custom-element/DSD rendering, class components other than `For`, out-of-order streaming, partial/island hydration.
- **Astro**: `elements-kit/integrations/astro` packages the renderer pair as an Astro island framework — `astro-server` implements Astro's `check`/`renderToStaticMarkup` over `renderToString` (component-return `SNode` discrimination keeps it safe next to other renderers), `astro-client` maps client directives to `hydrate` (or `render` for `client:only`). Astro slots map to `children` / named props as thunks composing `<astro-slot>` / `<astro-static-slot>` wrapper elements around `<Fragment html>` regions; Server Islands (`server:defer`) work through the same contract.
- **Raw HTML regions**: `<Fragment html>{MaybeReactive<string>}</Fragment>` renders between Slot markers on all three renderers — server emits the string verbatim, hydration keeps the server content until the source changes, the client re-renders the region reactively. Script-inert parsing (§8). `ns="svg" | "mathml"` parses the string against a detached root element of that namespace and drops the root, so foreign content lands in the right namespace instead of XHTML — a detached `<template>` gives the parser no ancestor to switch modes on. The element is the parser's context rather than a text wrapper, so a premature `</svg>` can't escape the region. Generated code is the expected caller (the SVG plugin passes it); the server ignores it.
- **Await & code splitting** (`elements-kit/await`): code splitting is `async(() => import(…))` — the stream awaits the import in order, hydration defers `run()` and keeps server content until the chunk lands. `Await` shows its fallback only on the client while direct async children (or `when`) are pending; it stamps the region with ids + a pending-probe so the claim walk keeps server content (no fallback flash) and stays ek-data-aligned past the boundary. One async child per boundary is the supported SSR-hydration shape; props for code-split components use the element-factory recipe (`promise(op.then((C) => () => <C …/>))`).
