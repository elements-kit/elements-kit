# UI

Headless, accessible custom elements built on the `elements-kit` core. Same accessibility bar as [base-ui.com](https://base-ui.com); deeper minimalism — primitives over presets.

Core contracts → [ARCHITECTURE](../../ARCHITECTURE.md). Utilities → [utilities/README](../utilities/README.md). Doc-authoring → [DOCS](../../DOCS.md).

> Load-bearing. Any change to §2 (principles), §3 (architecture), or §5 (state contract) must land alongside the code change in the same PR.

---

## 1. Scope

**Is**: a catalog of headless custom elements where each element exposes one behavior — focus trap, roving tabindex, overlay positioning, checkbox semantics, listbox keyboard model. Built with `@reactive` fields, `@attributes`, `connectedScope` / `disconnectedScope`, and JSX from the core.

**Is not**: a styled component kit, a design system, a form framework, or a packaged `<Select>` / `<Dropdown>` / `<Combobox>`. Composite widgets exist as **examples** (docs + playgrounds), not as exports.

The user-mental-model: instead of an opaque `<Select>`, you compose `<x-popover>` + `<x-listbox>` + `<x-option>`. Instead of a multi-select dropdown, you compose `<x-checkbox>` items inside an `<x-overlay>` aggregated by an `<x-picker>`. Each piece is replaceable. Each piece is one behavior.

Public API mimics the platform: native DOM shape, native event names where one exists (`change`, `input`, `toggle`, `beforetoggle`, `cancel`, `close`), native attribute conventions. Custom events only when no native equivalent fits, and they follow the same shape (lowercase, no colons in a name where a native one would not have them — see §3 *Event contract*).

---

## 2. Principles

Load-bearing. Mirrors the spirit of [ARCHITECTURE §3](../../ARCHITECTURE.md).

1. **One element, one behavior.** No element does two jobs. `<x-overlay>` opens and closes; it does not also render a list or own selection.
2. **Composition over presets.** Composite widgets are examples, not tags. The picker example — `<x-checkbox>` inside `<x-overlay>` aggregated by `<x-picker>` — is the canonical illustration.
3. **WAI-ARIA APG conformance is the floor.** Every element cites the [APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) it implements. Keyboard model, focus management, ARIA roles and states are part of the contract — not styling sugar. Divergences are recorded in the element's doc with a reason.
4. **Headless by default; optional theme layer.** Core ships no CSS. A separate, opt-in theme package may exist on top of the headless core and never leaks back into it. Authors who skip the theme style via `::part`, `[data-state="open"]` attribute selectors, or shadow-piercing. No tokens, no class hooks in core. Mirrors [ARCHITECTURE §9](../../ARCHITECTURE.md).
5. **Signals stay inside the element; expose via accessor or `@reactive`.** State lives as private fields on the custom element. The only public surfaces are `@reactive` instance fields and getter/setter accessors — no global stores, no module-level signals, no exported `Signal<T>` factories per element. Readable, writable, and observable from React via [`useSignal`](../integrations/react.ts). Attributes mirror per [ARCHITECTURE §5e](../../ARCHITECTURE.md); properties win on conflict.
6. **Mimic the native platform.** Public API shape, attribute names, event names, and ARIA mirror native HTML elements as closely as possible. Use native events (`change`, `input`, `toggle`, `beforetoggle`, `cancel`, `close`) before inventing custom ones. When a custom event is unavoidable, it follows DOM conventions — lowercase, bubbling, composed where appropriate, `detail` typed.
7. **Slots over props for content.** Prefer `<slot>` (shadow DOM) for content placement; fall back to the [`Slot`](../slot.ts) class only for elements that intentionally render in light DOM. Configuration goes through attributes / properties.
8. **Framework integration is types-first.** No framework wrappers in core — every element is an `HTMLElement`. For each framework, prefer a **types-only** integration (props typings, JSX intrinsic augmentation, ref typing) so authors get autocomplete and type-checking with zero runtime cost. A runtime integration package ships only when types alone cannot bridge the gap (e.g. React's [`useSignal`](../integrations/react.ts) for re-render).
9. **Cleanup via `connectedScope` / `disconnectedScope`.** No manual `addEventListener` bookkeeping. Every element follows [ARCHITECTURE §5](../../ARCHITECTURE.md) — setup runs in a detached `effectScope`; disconnect disposes it.
10. **Controlled and uncontrolled in one shape.** Default state lives in an internal `@reactive` field. Passing a `Signal<T>` in via a property switches to controlled mode (the element subscribes instead of owning). Single API — no `value` / `defaultValue` split.
11. **Form participation is opt-in.** Form-associated custom elements (`static formAssociated = true` + `ElementInternals`) only on elements where the APG pattern expects form semantics — checkbox, radio, switch, listbox-as-select. Not bolted onto behavior elements.

---

## 3. Architecture

### Naming

- Tag prefix: `x-`.
- One primary export per file. Filename = primary export.
- Behavior elements named for the behavior, not the widget — `x-overlay`, `x-focus-trap`, `x-roving-tabindex`. Not `x-dropdown-menu`.

### Layering

```text
primitives/      → focus-trap, roving-tabindex, overlay (positioning), portal, dismissable-layer
inputs/          → checkbox, radio, switch, button         (form-associated)
collections/     → option, listbox, menu-item               (depend on roving-tabindex)
surfaces/        → popover, dialog, tooltip                 (depend on overlay + dismissable-layer + focus-trap)
composers/       → picker, select-recipe, combobox-recipe   (docs only)
```

No cycles. Inputs and collections never depend on surfaces. Update this graph when adding an element.

### State contract

Every stateful element documents its `@reactive` fields in a uniform table:

| Field | Type | Controlled? | Writable? | Attribute mirror |
|-------|------|-------------|-----------|------------------|
| `open` | `Signal<boolean>` | yes | yes | `open` |
| `disabled` | `Signal<boolean>` | yes | yes | `disabled` |

Same shape for every element so authors can predict the API across the catalog.

### Event contract

Mimic native events first. Use `change`, `input`, `toggle`, `beforetoggle`, `cancel`, `close` where they fit — same names, same `detail` conventions, same cancellability semantics. A custom event lands only when no native equivalent exists; when it does, it stays lowercase, follows the native DOM shape, and documents `detail`, bubbling, and composition.

| Event | `detail` | Bubbles | Composed | Notes |
| --- | --- | --- | --- | --- |
| `toggle` | `{ oldState, newState }` | yes | yes | Native — fires on open/close, mirrors [`HTMLDialogElement` / Popover API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/toggle_event). |
| `beforetoggle` | `{ oldState, newState }` | yes | yes | Native — cancellable. |
| `change` | — | yes | yes | Native — committed value change on inputs (checkbox, radio, switch, listbox). |
| `close` | `{ reason: "escape" \| "outside" \| "programmatic" }` | yes | yes | Custom — `reason` is the only field native `close` lacks. |

### Accessibility contract

Every element ships, in its source-file JSDoc and its docs page:

- APG pattern link.
- Roles applied.
- ARIA attributes the element manages (and which it leaves to the author).
- Keyboard map (key → action table).
- Focus management rules (where focus goes on open, close, key navigation).

### Composition mechanics

Worked example for the user's picker:

- `<x-overlay>` owns `open: Signal<boolean>` and emits `ek:open` / `ek:close`.
- `<x-checkbox>` items inside emit native `change` events with their value.
- `<x-picker>` listens to bubbled `change` from the overlay subtree and aggregates into `selected: Signal<Set<T>>`.
- No element knows about the others' types. Swap `<x-checkbox>` for `<x-radio>` and the picker becomes single-select with no picker code change.

Composition is via:
- **Slots** — content placement.
- **Bubbled custom events** — child → ancestor signaling.
- **Property injection of signals** — ancestor → descendant controlled state.
- **`@reactive` fields read by `useSignal` / `effect`** — observation from outside.

---

## 4. Initial primitive catalog

v0 = the load-bearing set. Composite surfaces and inputs that depend on form semantics come once primitives stabilize.

| Element | APG pattern | Phase | Depends on |
|---------|-------------|-------|------------|
| `x-portal` | — | 1 | — |
| `x-focus-trap` | [Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) (focus rules) | 1 | — |
| `x-overlay` | — | 1 | `resize-observer`, `intersection-observer` |
| `x-dismissable-layer` | — | 1 | `on-click-outside`, `event-listener` |
| `x-text-input` | — *(native `<input>` / `<textarea>` semantics)* | 2 | — *(CSS only)* |
| `x-arrow` | — *(decorative)* | 2 | — *(CSS only)* |
| `x-accordion` | [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) *(native `<details>` semantics)* | 2 | — *(CSS only)* |
| `x-toggle` | [Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/) *(native checkbox/radio semantics)* | 2 | — *(CSS only)* |
| `x-form` | — | 2 | `MutationObserver`, dot-prop util |
| `x-checkbox` | [Checkbox](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) | 2 | `ElementInternals` |
| `x-radio-group` + `x-radio` | [Radio](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) | 2 | `x-roving-tabindex`, `ElementInternals` |
| `x-switch` | [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) | 2 | `ElementInternals` |
| `x-roving-tabindex` | — | 3 | `event-listener` |
| `x-option` | [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) | 3 | — |
| `x-listbox` | [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) | 3 | `x-roving-tabindex` |
| `x-popover` | — | 4 | `x-overlay`, `x-dismissable-layer` |
| `x-dialog` | [Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | 4 | `x-overlay`, `x-focus-trap`, `x-portal` |
| `x-tooltip` | [Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) | 4 | `x-overlay` |
| `x-menu` | [Menu](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) | 4 | `x-listbox`, `x-popover` |
| `x-picker` (recipe) | — | 5 | `x-overlay`, `x-checkbox` / `x-radio` |
| `x-select` (recipe) | [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | 5 | `x-popover`, `x-listbox` |
| `x-combobox` (recipe) | [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | 5 | `x-popover`, `x-listbox`, input |

---

## 5. Build plan

Each phase ships: source file + Vitest test + playground demo + doc page under [`docs/src/content/docs/ui/`](../../docs/src/content/docs/ui/).

**Docs update is part of the merge, not a follow-up.** Adding or changing a component without landing the matching doc page in the same PR is a blocker. The doc page mirrors the source-file JSDoc — APG link, state contract, event contract, keyboard map, controlled / uncontrolled example, recipe links if any.

1. **Phase 0 — manifesto.** This README plus a placeholder `src/ui/index.ts` (not yet exported from `package.json`).
2. **Phase 1 — primitives.** `x-portal`, `x-focus-trap`, `x-overlay`, `x-dismissable-layer`. Adds `elements-kit/ui` subpath export. Validates the controlled / uncontrolled signal pattern at the simplest level (`open`).
3. **Phase 2 — inputs + form controller.** `x-form` (per §10), `x-checkbox`, `x-radio` + `x-radio-group`, `x-switch`. Form-associated. Validates `ElementInternals` integration end-to-end and the seed-on-first-sight contract against real fields.
4. **Phase 3 — collections.** `x-roving-tabindex`, `x-option`, `x-listbox`. Validates the keyboard-model contract.
5. **Phase 4 — surfaces.** `x-popover`, `x-dialog`, `x-tooltip`, `x-menu`. Validates composition of multiple primitives.
6. **Phase 5 — examples.** `x-picker`, `x-select`, `x-combobox` as docs-only pages with playgrounds under [`docs/src/playground/files/`](../../docs/src/playground/files/).

---

## 6. Quality bars

- Vitest test per element covering: every key in the APG keyboard map, ARIA attribute application, controlled / uncontrolled mode parity, no leaked listeners after `disconnectedCallback`.
- Matching doc page under [`docs/src/content/docs/ui/`](../../docs/src/content/docs/ui/) lands in the same PR as the source. CI should reject a component change without a docs change.
- No `console.*` under `src/` (per [AGENTS.md](../../AGENTS.md)).
- Node-import-safe — module-level reads of `window` / `document` gate through [`isBrowser`](../utilities/environment.ts).
- TypeScript: every element augments `CustomElementRegistry` (per [`src/custom-elements.ts`](../custom-elements.ts)) so JSX gets typed props and refs.
- JSDoc on the class includes APG link, roles, keyboard map. Doc page mirrors it.

---

## 7. Do-not

- No CSS, no class names baked in, no design tokens.
- No packaged composite widgets exported from `src/ui/`. examples live in docs.
- No callback props where a `CustomEvent` works.
- No `value` / `defaultValue` split — controlled vs uncontrolled is decided by whether a `Signal<T>` was passed.
- No imports from `surfaces/` into `inputs/` or `collections/`. No cycles.
- No constructor-mounted DOM. Mount in `connectedCallback` via `connectedScope`.

---

## 8. Open questions

Resolve before Phase 1 lands:

- **Shadow DOM vs light DOM default.** Proposal: light DOM with `Slot`-class regions for behavior primitives (invisible, no visual structure to encapsulate); shadow DOM for surfaces (`x-dialog`, `x-popover`, `x-tooltip`) that own visual structure and benefit from `::part` styling boundaries.
- **`::part` naming convention.** Proposal: kebab-case, role-driven (`part="trigger"`, `part="content"`, `part="indicator"`).
- **Where examples live.** Proposal: docs-only under `docs/src/content/docs/ui/examples/` plus runnable demos in `docs/src/playground/files/`. Nothing under `src/ui/examples/`.
- **Animation primitive.** Out of scope for v0. Authors handle transitions via `[data-state]` attribute selectors and CSS.

---

## 9. Prior art

Reference, not dependency. Track these to keep API choices defensible.

- **[Open UI](https://open-ui.org/)** — W3C/WHATWG group spec'ing native `<selectlist>`, popover, anchor positioning, invokers. Tracked so element APIs converge with the platform (per principle 6). Cite their research in component docs (anatomy diagrams, keyboard maps). No runtime dependency, no polyfills.
- **[Lion](https://lion.js.org/components/)** — closest existing project in scope (headless web components, a11y-first). Read for prior art on `FormControlMixin`, `OverlayController`, focus trap. Architecture diverges (LitElement + mixins + base CSS); patterns are studied, not adopted.
- **[Base UI](https://base-ui.com/)** —  React-only, but the gold standard for headless component anatomy and the controlled/uncontrolled split. Used as a behavioral reference. accessibility bar and minimalist surface area benchmark.
