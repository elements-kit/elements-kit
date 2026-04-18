# AGENTS.md

Agent navigation. Pair [SPEC.md](SPEC.md) (canonical contracts) + [README.md](README.md) (user API). This file = shortcuts, not duplication.

## Quick start

```sh
pnpm install
pnpm build                              # tsdown → dist/
pnpm test                               # vitest run (happy-dom)
pnpm test:watch                         # vitest watch
pnpm --filter elements-kit-docs dev     # docs (Astro/Starlight)
pnpm --filter example dev               # example (Vite)
pnpm build:docs                         # lib + docs
```

pnpm 10.33, workspaces via [pnpm-workspace.yaml](pnpm-workspace.yaml).

## Maintenance obligation

Change a fundamental thing → update docs in the same PR. Rule of thumb: if a future agent answers users differently because of your change, surface docs must reflect it.

| Change | Update |
|--------|--------|
| Public API (add/rename/remove export, new subpath) | [README.md](README.md) Packages + usage, [SPEC.md](SPEC.md) §2, [src/utilities/README.md](src/utilities/README.md) if utility, matching `.mdx` in [docs/src/content/docs/](docs/src/content/docs/) |
| Reactive semantics | [SPEC.md](SPEC.md) §3, matching `.mdx` |
| JSX contract | [README.md](README.md) Prop namespaces, [SPEC.md](SPEC.md) §4, [elements.mdx](docs/src/content/docs/elements.mdx) / [components.mdx](docs/src/content/docs/components.mdx) |
| Custom-element contract | [SPEC.md](SPEC.md) §5, [custom-elements.mdx](docs/src/content/docs/custom-elements.mdx) |
| New utility | file + test + [src/utilities/README.md](src/utilities/README.md) row + dep graph + playground/MDX when worth it |
| Build / polyfill / deps | [README.md](README.md) Installation, [SPEC.md](SPEC.md) §7–8, AGENTS Quick start |
| Cleanup convention | [SPEC.md](SPEC.md) §6, this file, utilities README tail |

## Repo map

| Path | Role |
|------|------|
| [src/index.ts](src/index.ts) | Root barrel — `For`, re-exports |
| [src/signals/](src/signals/) | `signal`, `computed`, `effect`, `effectScope`, `batch`, `untracked`, `trigger`, `onCleanup`, `@reactive` |
| [src/jsx-runtime/](src/jsx-runtime/) | JSX factory, `createElement`, `For`, slots, fragments |
| [src/attributes.ts](src/attributes.ts) | `@attributes` decorator |
| [src/slot.ts](src/slot.ts) | `Slot` class |
| [src/integrations/react.ts](src/integrations/react.ts) | `useSignal`, `useScope` |
| [src/utilities/](src/utilities/) | Reactive browser-API helpers — [catalog](src/utilities/README.md) |
| [src/lib.ts](src/lib.ts) | Internal signal engine (not public) |
| [src/polyfill.ts](src/polyfill.ts) | `Symbol.dispose` shim only |
| [docs/](docs/) | Astro + Starlight docs |
| [docs/src/content/docs/](docs/src/content/docs/) | `.mdx` guides |
| [docs/src/playground/files/](docs/src/playground/files/) | Sandpack demos (`?raw` imports) |
| [example/](example/) | Vite sandbox |
| [tsdown.config.ts](tsdown.config.ts) | Build config |
| [vitest.config.ts](vitest.config.ts) | Tests |

## Build & test

- `tsdown` → one `dist/*.mjs` + `.d.ts` per subpath in [package.json](package.json) `exports`. No bundler beyond.
- vitest + happy-dom. Tests colocated `*.test.ts`. Single: `pnpm exec vitest path/to/file.test.ts`.
- Docs: `pnpm --filter elements-kit-docs build`. Imports lib via `workspace:*` → build lib first (`build:docs` chains).

## Conventions (rules — semantics in SPEC)

- **Naming**: no universal. `createX` for reactive factories. Verbs (`on`, `onClickOutside`) for listeners. Imperatives (`retry`, `async`, `promise`, `navigate`) for triggers. Pre-instantiated constants (`online`, `windowFocused`, `activeElement`, `currentLocation`) for page singletons. One primary export per module; filename = primary export.
- **Reactive children**: `{() => count()}` or pass the signal — never `{count()}`. ([SPEC §4](SPEC.md))
- **`onCleanup`**: works in `effect` / `effectScope` / `computed`. Any depth. ([SPEC §3, §6](SPEC.md))
- **`Disposable`**: on struct returns only. Never on raw `Signal`/`Computed`. ([SPEC §6](SPEC.md))
- **Factory assumes a scope**. Cleanup routes through `onCleanup`.
- **Utility-to-utility deps**: import only foundation modules — `event-listener` (`on`), `event-driven` (`fromEvent`/`sync`), `resize-observer`, `intersection-observer`, `mutation-observer`. No cycles. Update [dep graph](src/utilities/README.md) on add.
- **Node import safety**: module-level reads of `window` / `document` / `screen` / `navigator` / `location` / `history` gate through `isBrowser` from `src/utilities/environment.ts`. Factories touching globals inside their body are fine. New utilities: row in `src/utilities/ssr.test.ts`; singletons assert neutral defaults.
- **No wrapper elements**: JSX + Slot emit direct DOM.

## Extending utilities

1. `src/utilities/<name>.ts` → primary symbol.
2. `src/utilities/<name>.test.ts` colocated.
3. Auto-exposed via `"./utilities/*"` export — no `package.json` edit.
4. Add row + dep-graph entry to [src/utilities/README.md](src/utilities/README.md).
5. Reuse `on`, `fromEvent`/`sync`, observer wrappers over raw DOM.

## Docs workflow

- `.mdx` → [docs/src/content/docs/](docs/src/content/docs/).
- Live demo: `.tsx` in [docs/src/playground/files/](docs/src/playground/files/), import `?raw`, pass to `<Playground>` ([Playground.astro](docs/src/playground/Playground.astro)).
- Shared Sandpack entry mounts `App` from `main.tsx` ([index.js](docs/src/playground/files/index.js)).
- Group related playgrounds with Starlight `<Tabs>` / `<TabItem>`.

## Do-not

- No VDOM, no diffing.
- No React wrappers in core — bridge hooks only in `integrations/react`.
- No runtime deps beyond `dom-expressions`.
- No SSR, no hydration.
- No `console.*` under [src/](src/). Brand symbols (`SIGNAL` / `COMPUTED` / `EFFECT` / `EFFECT_SCOPE`) don't log. Playground, example, tests, JSDoc may log.
- No `Symbol.dispose` on `Signal` / `Computed`.
- No cycles in utilities graph.
- No swallowing effect errors — let them propagate.
