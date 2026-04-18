# Docs

Rules for `.mdx` pages in [docs/src/content/docs/](docs/src/content/docs/) and playground files in [docs/src/playground/files/](docs/src/playground/files/).

How-the-library-works: [ARCHITECTURE.md](ARCHITECTURE.md). Contributor rules: [CONTRIBUTING.md](CONTRIBUTING.md).

> Changes to page structure or playground conventions land here before you rewrite existing pages.

## File ownership

One concept per page. Canonical map:

| Page | Owns |
|------|------|
| [index.mdx](docs/src/content/docs/index.mdx) | Landing. |
| [signals.mdx](docs/src/content/docs/signals.mdx) | `signal` / `computed` / `effect` / `effectScope` / `batch` / `untracked` / `onCleanup`. |
| [stores.mdx](docs/src/content/docs/stores.mdx) | `@reactive` class pattern. |
| [elements.mdx](docs/src/content/docs/elements.mdx) | JSX → DOM, prop namespaces, `For`. |
| [components.mdx](docs/src/content/docs/components.mdx) | `render()` class components. |
| [custom-elements.mdx](docs/src/content/docs/custom-elements.mdx) | `HTMLElement` + `@attributes` + `@reactive`. |
| [promise.mdx](docs/src/content/docs/promise.mdx) | `promise` / `ReactivePromise`. |
| [async.mdx](docs/src/content/docs/async.mdx) | `async` / `Async`. |
| [utilities.mdx](docs/src/content/docs/utilities.mdx) | Utilities overview + catalog link. |

## Page template

Frontmatter (`title`, `description`) → one-line hook → sections in order:

1. Concept — what it is, why it exists.
2. API — exported shapes, signatures.
3. Example — minimal working code.
4. Caveats — footguns in `:::caution[…]` blocks.
5. Playground — `<Playground>` (or `<Tabs>` of `<Playground>`).

## Playgrounds

- One `.tsx` per concept in [docs/src/playground/files/](docs/src/playground/files/).
- Import with `?raw`:
  ```ts
  import CODE from "@/playground/files/<name>.tsx?raw";
  ```
- Wrap in `<Playground>` ([docs/src/playground/Playground.astro](docs/src/playground/Playground.astro)). Shared entry [docs/src/playground/files/index.js](docs/src/playground/files/index.js) mounts `App` from `main.tsx`.
- Multi-facet pages: group in Starlight `<Tabs>` / `<TabItem>` from `@astrojs/starlight/components` — one `<Playground>` per tab (see [signals.mdx](docs/src/content/docs/signals.mdx) for the pattern).

## Code examples

- Show full imports — readers copy-paste.
- Realistic names (`user`, `cart`, `fetchTodo`) — no `foo` / `bar` outside type positions.
- Use `magic-move` blocks for progressive reveals across multiple snippets.
- Use `:::caution[Title]` for footguns; `:::note[…]` for clarifications.

## Cross-linking

- MDX → ARCHITECTURE is encouraged for rigor ("full contract in [ARCHITECTURE §4](../../ARCHITECTURE.md)").
- ARCHITECTURE does **not** link back into MDX. ARCHITECTURE is canonical; MDX explains.
- Within MDX, use relative links between pages (Starlight resolves them).

## Terminology

[ARCHITECTURE.md §10 Glossary](ARCHITECTURE.md) is canonical. Do not introduce synonyms in MDX — use "signal", "computed", "effect", "store" as defined. If you need a new term, add it to the glossary first.
