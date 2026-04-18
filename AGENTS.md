# AGENTS.md

Navigation map for AI coding agents working in this repo. Pair with [SPEC.md](SPEC.md) for quality bars and [README.md](README.md) for user-facing API.

## Quick start

```sh
pnpm install
pnpm build                              # tsdown → dist/
pnpm test                               # vitest run (happy-dom)
pnpm test:watch                         # vitest watch
pnpm --filter elements-kit-docs dev     # Astro/Starlight docs site
pnpm --filter example dev               # Vite example app
pnpm build:docs                         # build lib + docs together
```

Package manager: **pnpm 10.33** (workspaces defined in [pnpm-workspace.yaml](pnpm-workspace.yaml)).

## Maintenance obligation

When a fundamental thing changes, update the docs before handing off:

- **Public API change** (new/renamed/removed export, new subpath) → update [README.md](README.md) Packages table, relevant usage section, [SPEC.md](SPEC.md) §2 Public API surface, and [src/utilities/README.md](src/utilities/README.md) if it touches utilities. Add/update the corresponding `.mdx` in [docs/src/content/docs/](docs/src/content/docs/).
- **Reactive semantics change** (signal/computed/effect/onCleanup/batch/untracked behavior) → update [SPEC.md](SPEC.md) §3 and the relevant MDX page in [docs/src/content/docs/](docs/src/content/docs/).
- **JSX contract change** (new namespace, ref/slot/For behavior) → update [README.md](README.md) Prop namespaces table, [SPEC.md](SPEC.md) §4, [docs/src/content/docs/elements.mdx](docs/src/content/docs/elements.mdx) or [docs/src/content/docs/components.mdx](docs/src/content/docs/components.mdx).
- **Custom-element contract change** (decorator semantics, attribute wiring, inheritance) → update [SPEC.md](SPEC.md) §5 and [docs/src/content/docs/custom-elements.mdx](docs/src/content/docs/custom-elements.mdx).
- **New utility** → file + test + entry in [src/utilities/README.md](src/utilities/README.md) catalog + dependency graph + (when worth demonstrating) a playground file and an MDX page.
- **Build, polyfill, or dependency change** → update [README.md](README.md) Installation, [SPEC.md](SPEC.md) §7–8, AGENTS.md Quick start / Repo map.
- **Cleanup convention change** → update [SPEC.md](SPEC.md) §6, AGENTS.md Conventions, [src/utilities/README.md](src/utilities/README.md) tail section.

Rule of thumb: if an agent tomorrow would answer a user question differently because of your change, the surface docs for that question must reflect it. Do not land the code change without the doc change.

## Repo map

| Path | Role |
|------|------|
| [src/index.ts](src/index.ts) | Root barrel — `For`, core re-exports |
| [src/signals/](src/signals/) | Reactive primitives: `signal`, `computed`, `effect`, `effectScope`, `batch`, `untracked`, `trigger`, `onCleanup`, `@reactive` |
| [src/jsx-runtime/](src/jsx-runtime/) | JSX factory, `createElement`, `For`, slots, fragments, property/children bindings |
| [src/attributes.ts](src/attributes.ts) | `@attributes` decorator — wires `observedAttributes` + `attributeChangedCallback` |
| [src/slot.ts](src/slot.ts) | `Slot` class — comment-marker DOM region management |
| [src/integrations/react.ts](src/integrations/react.ts) | `useSignal`, `useScope` React hooks |
| [src/utilities/](src/utilities/) | 50+ reactive browser-API utilities (see [utilities README](src/utilities/README.md)) |
| [src/lib.ts](src/lib.ts) | Internal signal engine (not public API) |
| [src/polyfill.ts](src/polyfill.ts) | polyfill entry (`Symbol.dispose` only) |
| [docs/](docs/) | Astro + Starlight docs site |
| [docs/src/content/docs/](docs/src/content/docs/) | `.mdx` guide pages |
| [docs/src/playground/](docs/src/playground/) | Sandpack-backed `<x-playground>` custom element |
| [docs/src/playground/files/](docs/src/playground/files/) | Playground demo source imported via `?raw` |
| [example/](example/) | Vite sandbox app |
| [tsdown.config.ts](tsdown.config.ts) | Build config (entry points mirror `exports`) |
| [vitest.config.ts](vitest.config.ts) | Test runner config |

## Build & test

- **Build**: `tsdown` compiles each subpath entry listed in [package.json](package.json) `exports` into `dist/*.mjs` + `.d.ts`. No bundler beyond that.
- **Tests**: colocated `*.test.ts` / `*.test.tsx` files. `happy-dom` provides DOM for JSX and custom-element tests. Run all via `pnpm test`; single file via `pnpm exec vitest path/to/file.test.ts`.
- **Docs build**: `pnpm --filter elements-kit-docs build`. Docs import library via `workspace:*`, so lib must be built first (`build:docs` chains them).

## Conventions

- **Naming**: no single convention. Reactive factories typically use `createX` (e.g. `createHover`, `createMediaQuery`, `createInterval`). Listeners use verbs (`on`, `onClickOutside`). Side-effectful triggers use imperatives (`retry`, `async`, `promise`, `navigate`, `patchHistory`). Singletons that only make sense once per page are pre-instantiated constants (`online`, `windowFocused`, `activeElement`, `currentLocation`). One primary export per module; file name matches the primary export.
- **Reactive-child rule in JSX**: reading a signal inline (`{count()}`) captures a snapshot. Wrap in a function (`{() => count()}`) or pass the signal/computed directly (`{count}`, `{doubled}`) for live binding.
- **`onCleanup` at any depth**: register inside the current `effect`, `effectScope`, **or `computed`** — callers do not thread it through. Inside a `computed`, cleanup runs before re-evaluation and when the computed loses its last subscriber.
- **`Disposable` only on struct returns**: factories returning composite objects implement `[Symbol.dispose]`. Factories returning raw `Signal<T>` / `Computed<T>` rely solely on `onCleanup` — never attach `Symbol.dispose` to core reactive values.
- **Factory inside scope**: every utility assumes it runs inside an `effectScope` (or caller disposes explicitly). Cleanup always routes through `onCleanup`.
- **No wrapper elements**: JSX and Slot emit to the DOM directly. No virtual nodes, no host wrappers.
- **Utility-to-utility dependencies**: when a utility builds on another, import only from the foundation modules listed in the dependency graph in [src/utilities/README.md](src/utilities/README.md): `event-listener` (`on`), `event-driven` (`fromEvent`/`sync`), `resize-observer`, `intersection-observer`, `mutation-observer`. Do not create cycles. Update the graph when adding a new module.
- **Node import safety**: any module-level read of a DOM global (`window`, `document`, `screen`, `navigator`, `location`, `history`) must be gated by `isBrowser` from [src/utilities/environment.ts](src/utilities/environment.ts). Factories that only touch globals inside their returned object are fine. New utilities get a row in [src/utilities/ssr.test.ts](src/utilities/ssr.test.ts) and a neutral-value assertion if they export a singleton.

## Extending utilities

1. Add `src/utilities/<name>.ts` exporting its primary symbol.
2. Add colocated `src/utilities/<name>.test.ts`.
3. Entry is auto-exposed via the `"./utilities/*"` export pattern — no `package.json` edit required.
4. Update the table and dependency graph in [src/utilities/README.md](src/utilities/README.md).
5. Prefer reusing `on`, `fromEvent`/`sync`, or the observer wrappers over raw DOM APIs.

## Docs workflow

- Add/edit `.mdx` pages in [docs/src/content/docs/](docs/src/content/docs/).
- For live demos: add a `.tsx` file under [docs/src/playground/files/](docs/src/playground/files/), import with `?raw`, pass to `<Playground>` ([docs/src/playground/Playground.astro](docs/src/playground/Playground.astro)).
- Shared Sandpack entry: [docs/src/playground/files/index.js](docs/src/playground/files/index.js) mounts `App` from `main.tsx`.
- Use Starlight `<Tabs>` / `<TabItem>` from `@astrojs/starlight/components` to group related playgrounds per concept.

## Do-not list

- No virtual DOM, no diffing layer.
- No React wrappers around core primitives — only thin bridge hooks in `integrations/react`.
- No runtime dependencies beyond `dom-expressions`.
- No SSR code paths, no hydration.
- No `console.*` in library code under [src/](src/).
- Do not attach `Symbol.dispose` to `Signal<T>` / `Computed<T>`.
- Do not introduce cycles in the utilities dependency graph.
- Do not swallow errors inside effects — let them propagate.
