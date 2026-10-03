# Docs

Rules for `.mdx` pages in [docs/content/docs/](docs/content/docs/) and playground files in [docs/src/playground/files/](docs/src/playground/files/). Library semantics: [ARCHITECTURE.md](ARCHITECTURE.md). Contributor rules: [CONTRIBUTING.md](CONTRIBUTING.md).

> Changes to page structure or playground conventions land here before you rewrite existing pages.

## Voice & tone

- Second person, present tense. "You call `signal()`" — not "we call".
- Direct. State the thing, then the why.
- No marketing words ("powerful", "seamless", "blazing") in guide / concept pages — save them for [README.md](README.md).
- Assume `signal` / `computed` fluency after Getting Started.
- Short paragraphs (1–3 sentences). **Bold** only for rule-level emphasis — max one per paragraph.
- No emojis in body. No rhetorical-question headings.
- Favor composition in examples — multi-step builds with named primitives (`sync(fromEvent(…), …)`, `on(el, …)`, `async(fn)`) over single opaque factory calls. Mirrors the library's own layering.

## Page skeleton

Every page, top to bottom:

1. **Frontmatter** — `title` and `description` both required. Optional: `navTitle` (sidebar label when it differs from the title), `badge: CSS | JS` (UI component pages).
2. **Hook** — one paragraph, 2–3 sentences, no code.
3. **Playground** — position per "Playground" rules below.
4. **Body** — H2s ordered by reader priority (most-asked-first). H3 allowed. No H4+.
5. **See also** — 2–5 relative links at the bottom. Required — no orphan pages.

## Section rules

- Sentence-case headings, no trailing punctuation. Inline code allowed in H2/H3, never H1.
- First sentence of each section is the takeaway — readers skim H2s + openers.
- Section body ≤ 150 words before a code block. Longer → split.
- Caveats inline as `<Callout type="warn">` next to what they apply to — never a bottom "gotchas" dump.

## Playground — position, size, style

- **Default: top**, directly after the hook.
- **Landing page: no playground.** Static hero snippet + link to `/signals` — respects the 5-second budget.
- **Embed**: register the file in [examples.ts](docs/src/playground/examples.ts) (id, title, section, page), import it `?raw`, then `<Playground example="id" source={RAW} />`. The source is server-rendered; the live editor loads when scrolled into view. Every registered example (tests excepted) is listed in `/playground`.
- **One primary playground per page.** `<Tabs items={[…]}>` + `<Tab value>` + multiple `<Playground>` only when a single demo would obscure per-facet learning (see [signals.mdx](docs/content/docs/(library)/signals.mdx)).
- **Tab labels** ≤ 12 chars. Lower case except proper nouns and identifiers (`Counter`, `Batch`, `onCleanup`).

### Playground file style

- Imports at top. Everything runnable as-is.
- Realistic names (`cart`, `user`, `todos`). No `foo` / `bar` outside type positions.
- Inline CSS (`style="…"`). No external stylesheets unless the demo is about styling.
- Colours read on light and dark previews: neutral greys with alpha (`#8884` borders, `#8881` fills, `#888` muted text), not light-only hex.
- Export `App` from the file; the playground mounts it (or call `render(…)` yourself).
- Tests (`*.test.ts`): global `test` / `describe` / `expect` (common matchers); results show in the preview.

## Code blocks

- Full imports in the first snippet on a page; subsequent snippets may elide.
- Language tag required: ` ```ts `, ` ```tsx `, ` ```json `, ` ```sh `.
- `magic-move` for progressive reveals (3–5 frames separated by `---` lines, one idea evolves) — not unrelated variants. Precompiled at build ([docs/src/mdx/magic-move.ts](docs/src/mdx/magic-move.ts)); the `.md` twin shows the last frame.
- `twoslash` meta for type hovers. Add `// @noErrors` when the snippet is illustrative.
- No pseudo-code. Every block compiles or is marked illustrative.
- Output as inline comments: `console.log("x"); // x`.
- Before / after = two labelled blocks (`// before`, `// after`), not `+` / `-` markers.

## Callouts

fumadocs `<Callout>`, available without importing. Titles with inline code take JSX: `title={<>Use <code>run()</code></>}`.

- `<Callout type="warn" title="…">` — footguns, silent bugs, cleanup gotchas.
- `<Callout type="info" title="…">` — optional clarifications.
- `<Callout type="idea" title="…">` — non-obvious shortcuts. Max one per page.
- `<Callout type="error" title="…">` — reserved for data-loss / irreversible scenarios.

## MDX components

Provided by [docs/src/docs/mdx-components.tsx](docs/src/docs/mdx-components.tsx) — no imports needed: `Callout`, `Cards` / `Card`, `Tabs` / `Tab`, `Steps` / `Step`, `Playground`, `StorybookEmbed`, `Diagram` (Mermaid), `Island`. Import only playground sources (`?raw`) and icons.

`<Island name>` renders a live Astro island passed as a named slot from [docs/src/pages/[...slug].astro](docs/src/pages/[...slug].astro) — only for pages that demo the Astro integration.

## Sidebar

`meta.json` per folder sets order, separators (`"---Label---"`) and external links (`"external:[Label](url)"`). Root folders (`"root": true`) are the sidebar tabs: `(library)`, `(ui)`, `integrations`, `examples`. Parenthesised folders don't appear in URLs. A page that shares a name with a folder lives at `folder/index.mdx`. Unlisted pages build but stay out of the sidebar.

## Length targets

- Hook: ≤ 300 chars.
- Page body: 300–1200 words. Below → fragment (combine or cut). Above → split.
- Code snippets: ≤ 30 lines.
- Playground files: ≤ 100 lines.

## Cross-linking

- MDX may link to [ARCHITECTURE.md](ARCHITECTURE.md) for rigor; ARCHITECTURE does **not** link back into MDX.
- First mention of a primitive on a non-reference page links to its reference page.
- "See also" footers: 2–5 links, no more.
- Slug-relative paths without a trailing slash (`/signals`), not full URLs — pages build as `signals.html`.
- External links for MDN / TC39 / GitHub only.

## Terminology

Words in [ARCHITECTURE.md §10 Glossary](ARCHITECTURE.md) are canonical. Use them verbatim, lower case, no synonyms. New jargon → add to the glossary before using it here.

## File ownership

One concept per page. Paths under [docs/content/docs/](docs/content/docs/). Current map:

| Page | Owns | Archetype | Playground |
|------|------|-----------|------------|
| `(library)/index.mdx` | Landing + pointers | landing | none (static snippet) |
| `(library)/getting-started/installation.mdx` | `npm install`, tsconfig | how-to | top |
| `(library)/getting-started/quick-start.mdx` | Counter five ways — signals → custom element | how-to | top |
| `(library)/getting-started/philosophy.mdx` | Design philosophy — primitives, explicit contracts, batteries-included | concept | none |
| `(library)/signals.mdx` | `signal` / `computed` / `effect` / `effectScope` / `batch` / `untracked` / `onCleanup` | reference | top (Tabs) |
| `(library)/stores.mdx` | `@reactive` class pattern | how-to | top |
| `(library)/elements/index.mdx` | JSX → DOM, prop namespaces, live bindings | concept | top |
| `(library)/components.mdx` | `render()` classes | how-to | top |
| `(library)/elements/for.mdx` | `For` — keyed list rendering | reference | top |
| `(library)/custom-elements/index.mdx` | `HTMLElement` + overview | concept | bottom |
| `(library)/custom-elements/attributes.mdx` | `@attributes`, `ATTRIBUTES` | reference | top |
| `(library)/custom-elements/slots.mdx` | `Slot`, named slots | how-to | top |
| `(library)/custom-elements/styling.mdx` | CSS strategies | how-to | top |
| `(library)/promise.mdx` | `promise` / `ReactivePromise` / `ComputedPromise` | reference | top |
| `(library)/async.mdx` | `async` / `Async` core reference | reference | top |
| `(library)/utilities/index.mdx` | Utilities overview + catalog link | reference (index) | none |
| `integrations/react.mdx` | `useSignal`, `useScope` | reference | top |
| `examples/data-fetching.mdx` | `async` + retry + online + focus composition | how-to | top |
| `examples/routing.mdx` | `patchHistory` + `matches` / `match` + `navigate` SPA router | how-to | top |
| `examples/search.mdx` | `createDebounced` + `async` + `AbortController` search | how-to | top |
| `examples/infinite-scroll.mdx` | `createIntersectionObserver` + `async` paginated list | how-to | top |
| `examples/context.mdx` | `setContext` / `getContext` + `<dom-lifecycle>` propagation | how-to | top |
| `examples/toasts.mdx` | Per-item `effectScope` + `createTimeout` queue | how-to | top |

## Docs roadmap

Split into issues when picked up.

- **Concepts group** — pages for Reactivity model, Cleanup & Scopes, JSX → DOM. Lift from existing pages; don't duplicate.
- **Utilities category pages** — split `utilities.mdx` into Timing / Network / Storage / Observation / Routing / DOM events / Browser APIs / Media / State. Overview stays as index.
- **Writing UI/Refs** — dedicated page for the `ref` callback + cleanup return.
- **More examples** — Auth flow, Forms, Cross-tab sync.
- **Last-modified footer** — build-time timestamp on every page.
