# Docs

Rules for `.mdx` pages in [docs/src/content/docs/](docs/src/content/docs/) and playground files in [docs/src/playground/files/](docs/src/playground/files/).

How-the-library-works: [ARCHITECTURE.md](ARCHITECTURE.md). Contributor rules: [CONTRIBUTING.md](CONTRIBUTING.md).

> Changes to page structure or playground conventions land here before you rewrite existing pages.

## Voice & tone

- Second person, present tense. "You call `signal()`" — not "we call" or "one calls".
- Direct. State the thing, then the why.
- No marketing words in guide / concept pages ("powerful", "seamless", "blazing"). Save those for [README.md](README.md).
- Assume `signal` / `computed` fluency after the Getting Started group.
- Short paragraphs (1–3 sentences). Break before a new idea.
- Inline code for identifiers. **Bold** only for rule-level emphasis — max one per paragraph.
- No emojis in body text. No rhetorical-question headings.
- Favor composition in examples. Show a multi-step build with named primitives (`sync(fromEvent(…), …)`, `on(el, …)`, `async(fn)`) over a single opaque factory call — it teaches the mental model and mirrors the library's own layering.

## Page skeleton

Every page, top to bottom:

1. **Frontmatter** — `title` and `description` both required.
2. **Hook** — one paragraph, 2–3 sentences, ≤ 300 chars. No code in the hook.
3. **Playground** — position per "Playground" rules below.
4. **Body** — H2s ordered by reader priority (most-asked-first). H3 allowed. No H4+.
5. **See also** — 2–5 relative links at the bottom. Required — no orphan pages.

## Section rules

- Sentence-case headings. No trailing punctuation. Inline code allowed in H2/H3, never in H1.
- First sentence of every section = the takeaway. Readers skim H2s + opening sentences.
- Section body ≤ 150 words before a code block. Longer → split the section.
- Caveats live inline as `:::caution[Title]` next to what they apply to — never a bottom "gotchas" dump.

## Playground — position, size, style

- **Default: top**, directly after the hook. Scanners, copiers, and evaluators reach for Run first.
- **Landing page: no Sandpack.** A static hero snippet plus a link to `/signals` loads faster and respects the 5-second budget.
- **Height**: default `height: 300` on the `<Playground>` wrapper. Increase only for multi-panel demos; add an inline comment explaining why.
- **One primary playground per page.** Use Starlight `<Tabs>` + multiple `<Playground>` only when a single demo would obscure per-facet learning (current [signals.mdx](docs/src/content/docs/signals.mdx) pattern).
- **Tab labels** ≤ 12 chars. Lower case except proper nouns and identifiers (`Counter`, `Batch`, `onCleanup`).

### Playground file style

- Imports at top. Everything runnable as-is.
- Realistic names (`cart`, `user`, `todos`). No `foo` / `bar` outside type positions.
- Inline CSS (`style="…"`). No external stylesheets unless the demo is about styling.
- Mount via the shared entry ([docs/src/playground/files/index.js](docs/src/playground/files/index.js)) — export `App` from `main.tsx`.
- Playground files ≤ 100 lines. Longer means the demo teaches too much.

## Code blocks

- Full imports in the first snippet on a page. Subsequent snippets may elide once established.
- Language tag required: ` ```ts `, ` ```tsx `, ` ```json `, ` ```sh `.
- `magic-move` for progressive reveals (3–5 frames, one idea evolves). Not for unrelated variants.
- No pseudo-code. Every block either compiles or is marked with a comment stating it's illustrative.
- Output as inline comments: `console.log("x"); // x`.
- Before / after uses two labelled blocks (`// before`, `// after`), not `+` / `-` markers.
- Code snippets ≤ 30 lines (playgrounds excepted).

## Callouts

- `:::caution[Title]` — footguns, silent bugs, cleanup gotchas.
- `:::note[Title]` — optional clarifications. Not required reading.
- `:::tip[Title]` — non-obvious shortcuts. Max one per page; tips become noise at scale.
- `:::danger[…]` — reserved for data-loss / irreversible scenarios. Don't reach for it today.

## Length targets

- Hook: ≤ 300 chars.
- Page body: 300–1200 words. Below → fragment (combine or cut). Above → split.
- Code snippets: ≤ 30 lines.
- Playground files: ≤ 100 lines.

## Cross-linking

- MDX may link to [ARCHITECTURE.md](ARCHITECTURE.md) for rigor ("full contract in [ARCHITECTURE §4](../../ARCHITECTURE.md)"). ARCHITECTURE does **not** link back into MDX.
- First mention of a primitive on a non-reference page links to its reference page.
- "See also" footers list 2–5 links. No more.
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
| `recipes/data-fetching.mdx` | `async` + retry + online + focus composition | how-to | top |
| `recipes/routing.mdx` | `patchHistory` + `matches` / `match` + `navigate` SPA router | how-to | top |
| `recipes/search.mdx` | `createDebounced` + `async` + `AbortController` search | how-to | top |
| `recipes/infinite-scroll.mdx` | `createIntersectionObserver` + `async` paginated list | how-to | top |
| `recipes/context.mdx` | `setContext` / `getContext` + `<dom-lifecycle>` propagation | how-to | top |
| `recipes/toasts.mdx` | Per-item `effectScope` + `createTimeout` queue | how-to | top |

## Docs roadmap

Tracked here; split into issues when someone picks them up.

- **Concepts group** — new pages for Reactivity model, Cleanup & Scopes, JSX → DOM mental model. Lift from existing pages; don't duplicate.
- **Utilities category pages** — split `utilities.mdx` into Timing / Network / Storage / Observation / Routing / DOM events / Browser APIs / Media / State. One page per category; overview stays as index.
- **Writing UI/Refs** — dedicated page for the `ref` callback + cleanup return.
- **More recipes** — Auth flow, Forms, Cross-tab sync. Establish patterns evaluators look for.
- **Last-modified footer** — build-time timestamp on every page.
