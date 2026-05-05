# AGENTS.md

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the library works (reactive model, JSX, custom elements, cleanup, glossary).
- [CONTRIBUTING.md](CONTRIBUTING.md) — quick start, build & test, quality bars, versioning, extending utilities, PR checklist.
- [DOCS.md](DOCS.md) — doc-authoring rules (file ownership, page template, playground conventions, terminology).
- [README.md](README.md) — user-facing API.

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
| [src/utilities/environment.ts](src/utilities/environment.ts) | `isBrowser` guard |
| [src/lib.ts](src/lib.ts) | Internal signal engine (not public) |
| [src/polyfill.ts](src/polyfill.ts) | `Symbol.dispose` shim only |
| [docs/](docs/) | Astro + Starlight docs |
| [docs/src/content/docs/](docs/src/content/docs/) | `.mdx` guides |
| [docs/src/playground/files/](docs/src/playground/files/) | Sandpack demos (`?raw` imports) |
| [example/](example/) | Vite sandbox |
| [tsdown.config.ts](tsdown.config.ts) | Build config |
| [vitest.config.ts](vitest.config.ts) | Tests |

## Conventions

- **Naming**: `createX` for factories, verbs for listeners (`on`, `onClickOutside`), imperatives for triggers (`retry`, `async`, `promise`, `navigate`), pre-instantiated singletons for page state (`online`, `windowFocused`, `activeElement`, `currentLocation`). One primary export per module; filename = primary export.
- **Reactive children in JSX**: `{() => count()}` or pass the signal — never `{count()}`. ([ARCHITECTURE §4](ARCHITECTURE.md))
- **`onCleanup`**: works in `effect` / `effectScope` / `computed`. Any depth. ([ARCHITECTURE §3, §6](ARCHITECTURE.md))
- **`Disposable`**: on struct returns only. Never on raw `Signal` / `Computed`. ([ARCHITECTURE §6](ARCHITECTURE.md))
- **Factory assumes a scope**. Cleanup routes through `onCleanup`.
- **Utility-to-utility deps**: import only foundation modules — `event-listener` (`on`), `event-driven` (`fromEvent` / `sync`), `resize-observer`, `intersection-observer`, `mutation-observer`. No cycles. Update [dep graph](src/utilities/README.md) on add.
- **Node import safety**: module-level reads of `window` / `document` / `screen` / `navigator` / `location` / `history` gate through `isBrowser`. Factories touching globals inside their body are fine.
- **No wrapper elements**: JSX + Slot emit direct DOM.

## Do-not

- No VDOM, no diffing.
- No React wrappers in core — bridge hooks only in `integrations/react`.
- No runtime deps beyond `dom-expressions`.
- No SSR, no hydration.
- No `console.*` under [src/](src/). Brand symbols (`SIGNAL` / `COMPUTED` / `EFFECT` / `EFFECT_SCOPE`) don't log. Playground, example, tests, JSDoc may log.
- No `Symbol.dispose` on `Signal` / `Computed`.
- No cycles in utilities graph.
- No swallowing effect errors — let them propagate.
- No new barrel files. Import from the owning file; don't add re-export `index.ts` files beyond the existing subpath entries.
