# Contributing

Rules for sending PRs to **elements-kit**. How-the-library-works: [ARCHITECTURE.md](ARCHITECTURE.md). Doc-authoring: [DOCS.md](DOCS.md). Agent navigation: [AGENTS.md](AGENTS.md).

> Changes to versioning, release process, or quality bars land here before (or alongside) the policy change.

## Repository

- [src/](src/) — library source ([signals](src/signals/), [jsx-runtime](src/jsx-runtime/), [utilities](src/utilities/), [integrations](src/integrations/))
- [docs/](docs/) — Astro + Starlight documentation site
- [example/](example/) — Vite sandbox
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the library works (reactive model, JSX, custom elements, cleanup)
- [DOCS.md](DOCS.md) — doc-authoring rules
- [AGENTS.md](AGENTS.md) — agent navigation map
- [src/utilities/README.md](src/utilities/README.md) — utilities catalog and dependency graph

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

Package manager: **pnpm 10.33**, workspaces defined in [pnpm-workspace.yaml](pnpm-workspace.yaml).

## Build & test

- **Build**: `tsdown` compiles each subpath entry listed in [package.json](package.json) `exports` into `dist/*.mjs` + `.d.ts`. No bundler beyond that.
- **Tests**: colocated `*.test.ts` / `*.test.tsx` files. `happy-dom` provides DOM for JSX and custom-element tests. Run all via `pnpm test`; single file via `pnpm exec vitest path/to/file.test.ts`.
- **Docs build**: `pnpm --filter elements-kit-docs build`. Docs import library via `workspace:*`, so lib must be built first (`build:docs` chains them).

## Quality bars

- **TypeScript**: strict. `noUncheckedIndexedAccess`. No `any` in public API. Public types exported alongside values.
- **Tests**: vitest + happy-dom. Every utility, JSX runtime file, signals primitive, and decorator has a colocated test. Coverage expectation: behavioral (API contract, cleanup firing order, reactive-read tracking, edge cases like nested batches, effect re-entry).
- **Dependencies**: exactly one runtime dep (`dom-expressions`). React is `peerDependencies` and optional.
- **Bundle shape**: subpath imports are tree-shakeable. Each utility module ships as its own entry so consumers pay only for what they import.
- **No cycles**: utilities must follow the graph in [src/utilities/README.md](src/utilities/README.md). Add to the graph when introducing a new module.
- **No `console.*` in library code**. Applies to everything under [src/](src/): no console output from production paths, no warnings, no info. Playground, example, test files ([docs/src/playground/files/](docs/src/playground/files/), [example/](example/), `*.test.ts`) and JSDoc code examples are exempt — they exist to demonstrate behavior and may log freely.
- **API additions**: new exports require an entry in the relevant `index.ts`, a doc page or utilities-README row, and colocated tests.

## Versioning & stability

- Semver. Pre-1.0 (currently `0.0.x`): minor version bumps may include breaking changes; patch versions are bug fixes only. Post-1.0 will follow standard semver.
- Stability tiers in [ARCHITECTURE.md §2](ARCHITECTURE.md) mean:
  - **stable** — breaking changes require a major bump (or, pre-1.0, a minor bump with changelog note).
  - **stable per module** — utilities may be deprecated individually; the subpath contract (`elements-kit/utilities/<name>` → single primary export) is stable.
- Deprecation: deprecated exports stay exported for at least one minor version with a `@deprecated` JSDoc tag pointing at the replacement before removal.
- Release artifact: `dist/` is the only directory published (`files: ["dist"]` in [package.json](package.json)). `src/` is not shipped.
- TypeScript floor: the version pinned in [package.json](package.json) devDependencies is the minimum supported (currently TS 6.x). Decorator syntax: Stage 3 TC39 decorators (not legacy `experimentalDecorators`).

## Extending utilities

1. Add `src/utilities/<name>.ts` exporting the primary symbol.
2. Add colocated `src/utilities/<name>.test.ts`.
3. Entry is auto-exposed via the `"./utilities/*"` export pattern — no `package.json` edit required.
4. Add a row + dep-graph entry to [src/utilities/README.md](src/utilities/README.md).
5. Reuse `on`, `fromEvent` / `sync`, the observer wrappers, and `async` / `promise` over raw DOM/Promise APIs. New utilities should decompose into these building blocks — a monolithic implementation needs justification in the PR description. See [element-scroll.ts](src/utilities/element-scroll.ts) (sync+fromEvent) and [long-press.ts](src/utilities/long-press.ts) (on+createTimeout) as references.
6. Gate any module-level read of a DOM global (`window`, `document`, `screen`, `navigator`, `location`, `history`) through `isBrowser` from [src/utilities/environment.ts](src/utilities/environment.ts). Add a row to [src/utilities/ssr.test.ts](src/utilities/ssr.test.ts); singletons assert neutral defaults.

## Maintenance obligation

When a fundamental thing changes, update the surface docs in the same PR. Rule of thumb: if a future contributor or agent answers a user differently because of your change, the docs for that answer must reflect it.

| Change | Update |
|--------|--------|
| Public API (add/rename/remove export, new subpath) | [README.md](README.md) Packages + usage, [ARCHITECTURE.md §2](ARCHITECTURE.md), [src/utilities/README.md](src/utilities/README.md) if a utility, matching `.mdx` in [docs/src/content/docs/](docs/src/content/docs/) |
| Reactive semantics | [ARCHITECTURE.md §3](ARCHITECTURE.md), matching `.mdx` |
| JSX contract | [README.md](README.md) Prop namespaces, [ARCHITECTURE.md §4](ARCHITECTURE.md), [elements.mdx](docs/src/content/docs/elements.mdx) / [components.mdx](docs/src/content/docs/components.mdx) |
| Custom-element contract | [ARCHITECTURE.md §5](ARCHITECTURE.md), [custom-elements.mdx](docs/src/content/docs/custom-elements.mdx) |
| New utility | file + test + [src/utilities/README.md](src/utilities/README.md) row + dep graph + playground / MDX when worth it |
| Build / polyfill / deps | [README.md](README.md) Installation, [ARCHITECTURE.md §7](ARCHITECTURE.md), this file Quick start |
| Cleanup convention | [ARCHITECTURE.md §6](ARCHITECTURE.md), [AGENTS.md](AGENTS.md), utilities README tail |
| Versioning / release policy | this file |
| Page structure / playground rules | [DOCS.md](DOCS.md) |

## PR checklist

- [ ] Tests added or updated (colocated `*.test.ts`).
- [ ] No new runtime deps (exception: approved in a linked issue).
- [ ] No `console.*` added under [src/](src/).
- [ ] Docs updated per the Maintenance obligation table.
- [ ] `pnpm build` and `pnpm test` pass locally.
- [ ] Public API changes mentioned in the PR description; deprecation path stated if removing.

## Do-not

- No VDOM, no diffing layer.
- No React wrappers around core primitives — only thin bridge hooks in [src/integrations/react.ts](src/integrations/react.ts).
- No runtime dependencies beyond `dom-expressions`.
- Server rendering stays inside `src/server/` and `src/hydrate/` — no SSR branches in the client runtime beyond the single renderer-dispatch check in `createElement`. Server code must never reach client bundles.
- Raw HTML only through `<Fragment html>` / `rawHtml()` (script-inert). The `innerHTML` prop throws in server rendering and hydration; strings elsewhere are text-only.
- No `Symbol.dispose` on `Signal<T>` / `Computed<T>`.
- No cycles in the utilities dependency graph.
- No swallowing errors inside effects — let them propagate.
- No new barrel files. Import from the file that owns the symbol (e.g. `elements-kit/utilities/hover`, not a re-export index). Existing `index.ts` files stay for public subpath entries; don't add more.
