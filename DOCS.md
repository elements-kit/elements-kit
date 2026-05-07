# Docs

Rules for `.mdx` pages in [docs/src/content/docs/](docs/src/content/docs/) and playground files in [docs/src/playground/files/](docs/src/playground/files/). Library semantics: [ARCHITECTURE.md](ARCHITECTURE.md). Contributor rules: [CONTRIBUTING.md](CONTRIBUTING.md).

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

1. **Frontmatter** — `title` and `description` both required.
2. **Hook** — one paragraph, 2–3 sentences, no code.
3. **Playground** — position per "Playground" rules below.
4. **Body** — H2s ordered by reader priority (most-asked-first). H3 allowed. No H4+.
5. **See also** — 2–5 relative links at the bottom. Required — no orphan pages.

## Section rules

- Sentence-case headings, no trailing punctuation. Inline code allowed in H2/H3, never H1.
- First sentence of each section is the takeaway — readers skim H2s + openers.
- Section body ≤ 150 words before a code block. Longer → split.
- Caveats inline as `:::caution[Title]` next to what they apply to — never a bottom "gotchas" dump.

## Playground — position, size, style

- **Default: top**, directly after the hook.
- **Landing page: no Sandpack.** Static hero snippet + link to `/signals` — respects the 5-second budget.
- **Height**: default `height: 300`. Increase only for multi-panel demos; add an inline comment explaining why.
- **One primary playground per page.** `<Tabs>` + multiple `<Playground>` only when a single demo would obscure per-facet learning (see [signals.mdx](docs/src/content/docs/signals.mdx)).
- **Tab labels** ≤ 12 chars. Lower case except proper nouns and identifiers (`Counter`, `Batch`, `onCleanup`).

### Playground file style

- Imports at top. Everything runnable as-is.
- Realistic names (`cart`, `user`, `todos`). No `foo` / `bar` outside type positions.
- Inline CSS (`style="…"`). No external stylesheets unless the demo is about styling.
- Mount via the shared entry ([docs/src/playground/files/index.js](docs/src/playground/files/index.js)) — export `App` from `main.tsx`.

## Code blocks

- Full imports in the first snippet on a page; subsequent snippets may elide.
- Language tag required: ` ```ts `, ` ```tsx `, ` ```json `, ` ```sh `.
- `magic-move` for progressive reveals (3–5 frames, one idea evolves) — not unrelated variants.
- No pseudo-code. Every block compiles or is marked illustrative.
- Output as inline comments: `console.log("x"); // x`.
- Before / after = two labelled blocks (`// before`, `// after`), not `+` / `-` markers.

## Callouts

- `:::caution[Title]` — footguns, silent bugs, cleanup gotchas.
- `:::note[Title]` — optional clarifications.
- `:::tip[Title]` — non-obvious shortcuts. Max one per page.
- `:::danger[…]` — reserved for data-loss / irreversible scenarios.

## Length targets

- Hook: ≤ 300 chars.
- Page body: 300–1200 words. Below → fragment (combine or cut). Above → split.
- Code snippets: ≤ 30 lines.
- Playground files: ≤ 100 lines.

## Cross-linking

- MDX may link to [ARCHITECTURE.md](ARCHITECTURE.md) for rigor; ARCHITECTURE does **not** link back into MDX.
- First mention of a primitive on a non-reference page links to its reference page.
- "See also" footers: 2–5 links, no more.
- Slug-relative paths (`/signals`), not full URLs. Starlight resolves them.
- External links for MDN / TC39 / GitHub only.

## Terminology

Words in [ARCHITECTURE.md §10 Glossary](ARCHITECTURE.md) are canonical. Use them verbatim, lower case, no synonyms. New jargon → add to the glossary before using it here.

## File ownership

One concept per page. Current map:

| Page | Owns | Archetype | Playground |
|------|------|-----------|------------|
| `index.mdx` | Landing + pointers | landing | none (static snippet) |
| `getting-started/installation.mdx` | `npm install`, tsconfig | how-to | top |
| `getting-started/quick-start.mdx` | Counter five ways — signals → custom element | how-to | top |
| `getting-started/philosophy.mdx` | Design philosophy — primitives, explicit contracts, batteries-included | concept | none |
| `signals.mdx` | `signal` / `computed` / `effect` / `effectScope` / `batch` / `untracked` / `onCleanup` | reference | top (Tabs) |
| `stores.mdx` | `@reactive` class pattern | how-to | top |
| `elements.mdx` | JSX → DOM, prop namespaces, live bindings | concept | top |
| `components.mdx` | `render()` classes | how-to | top |
| `elements/for.mdx` | `For` — keyed list rendering | reference | top |
| `custom-elements.mdx` | `HTMLElement` + overview | concept | bottom |
| `custom-elements/attributes.mdx` | `@attributes`, `ATTRIBUTES` | reference | top |
| `custom-elements/slots.mdx` | `Slot`, named slots | how-to | top |
| `custom-elements/styling.mdx` | CSS strategies | how-to | top |
| `promise.mdx` | `promise` / `ReactivePromise` / `ComputedPromise` | reference | top |
| `async.mdx` | `async` / `Async` core reference | reference | top |
| `utilities.mdx` | Utilities overview + catalog link | reference (index) | none |
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
