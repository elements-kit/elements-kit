# UI

Headless, accessible custom elements built on the `elements-kit` core. Same accessibility bar as [base-ui.com](https://base-ui.com); deeper minimalism — primitives over presets.

Core contracts → [ARCHITECTURE](../../ARCHITECTURE.md). Utilities → [utilities/README](../utilities/README.md). Doc-authoring → [DOCS](../../DOCS.md).

> Load-bearing. Any change to §2 (principles), §3 (architecture), or §5 (state contract) must land alongside the code change in the same PR.

---

## 1. Scope

**Is**: a catalog of headless custom elements where each element exposes one behavior — focus trap, roving tabindex, overlay positioning, checkbox semantics, listbox keyboard model. Built with `@reactive` fields, `@attributes`, `connectedScope` / `disconnectedScope`, and JSX from the core.

**Is not**: a styled component kit, a design system, a form framework, or a packaged `<Select>` / `<Dropdown>` / `<Combobox>`. Composite widgets exist as **recipes** (docs + playgrounds), not as exports.

The user-mental-model: instead of an opaque `<Select>`, you compose `<x-popover>` + `<x-listbox>` + `<x-option>`. Instead of a multi-select dropdown, you compose `<x-checkbox>` items inside an `<x-overlay>` aggregated by an `<x-picker>`. Each piece is replaceable. Each piece is one behavior.

Public API mimics the platform: native DOM shape, native event names where one exists (`change`, `input`, `toggle`, `beforetoggle`, `cancel`, `close`), native attribute conventions. Custom events only when no native equivalent fits, and they follow the same shape (lowercase, no colons in a name where a native one would not have them — see §3 *Event contract*).

---

## 2. Principles

Load-bearing. Mirrors the spirit of [ARCHITECTURE §3](../../ARCHITECTURE.md).

1. **One element, one behavior.** No element does two jobs. `<x-overlay>` opens and closes; it does not also render a list or own selection.
2. **Composition over presets.** Composite widgets are recipes, not tags. The picker example — `<x-checkbox>` inside `<x-overlay>` aggregated by `<x-picker>` — is the canonical illustration.
3. **WAI-ARIA APG conformance is the floor.** Every element cites the [APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) it implements. Keyboard model, focus management, ARIA roles and states are part of the contract — not styling sugar. Divergences are recorded in the element's doc with a reason.
4. **Headless by default; optional theme layer.** Core ships no CSS. A separate, opt-in theme package may exist on top — same role as [Radix Themes](https://github.com/radix-ui/themes) on top of Radix Primitives — and never leaks into the headless layer. Authors who skip the theme style via `::part`, `[data-state="open"]` attribute selectors, or shadow-piercing. No tokens, no class hooks in core. Mirrors [ARCHITECTURE §9](../../ARCHITECTURE.md).
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
6. **Phase 5 — recipes.** `x-picker`, `x-select`, `x-combobox` as docs-only pages with playgrounds under [`docs/src/playground/files/`](../../docs/src/playground/files/).

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
- No packaged composite widgets exported from `src/ui/`. Recipes live in docs.
- No callback props where a `CustomEvent` works.
- No `value` / `defaultValue` split — controlled vs uncontrolled is decided by whether a `Signal<T>` was passed.
- No imports from `surfaces/` into `inputs/` or `collections/`. No cycles.
- No constructor-mounted DOM. Mount in `connectedCallback` via `connectedScope`.

---

## 8. Open questions

Resolve before Phase 1 lands:

- **Shadow DOM vs light DOM default.** Proposal: light DOM with `Slot`-class regions for behavior primitives (invisible, no visual structure to encapsulate); shadow DOM for surfaces (`x-dialog`, `x-popover`, `x-tooltip`) that own visual structure and benefit from `::part` styling boundaries.
- **`::part` naming convention.** Proposal: kebab-case, role-driven (`part="trigger"`, `part="content"`, `part="indicator"`).
- **Where recipes live.** Proposal: docs-only under `docs/src/content/docs/ui/recipes/` plus runnable demos in `docs/src/playground/files/`. Nothing under `src/ui/recipes/`.
- **Animation primitive.** Out of scope for v0. Authors handle transitions via `[data-state]` attribute selectors and CSS.

---

## 9. Prior art

Reference, not dependency. Track these to keep API choices defensible.

- **[Open UI](https://open-ui.org/)** — W3C/WHATWG group spec'ing native `<selectlist>`, popover, anchor positioning, invokers. Tracked so element APIs converge with the platform (per principle 6). Cite their research in component docs (anatomy diagrams, keyboard maps). No runtime dependency, no polyfills.
- **[Lion](https://lion.js.org/components/)** — closest existing project in scope (headless web components, a11y-first). Read for prior art on `FormControlMixin`, `OverlayController`, focus trap. Architecture diverges (LitElement + mixins + base CSS); patterns are studied, not adopted.
- **[Base UI](https://base-ui.com/)** —  React-only, but the gold standard for headless component anatomy and the controlled/uncontrolled split. Used as a behavioral reference. accessibility bar and minimalist surface area benchmark.
- **[Radix Themes](https://www.radix-ui.com)** — Theme layer inspiration if we build one. No API influence on the headless layer.

---

## 10. Form controller contract

`<x-form>` is the form-level coordinator. It does not own field state — fields do, per principle 5. It owns *defaults*, *aggregation*, and *imperative access*.

### Hosting model

`<x-form>` requires a native `<form>` ancestor. It is a coordinator, not the form element itself.

```html
<form id="signup">
  <x-form default-values=...>
    <x-input name="email" />
    <x-checkbox name="agree" />
  </x-form>
</form>
```

Form-associated custom elements (`x-input`, `x-checkbox`, `x-radio`, `x-switch`) discover their form via the standard light-DOM ancestor walk used by `ElementInternals`. `<x-form>` listens to `submit` / `reset` / `formdata` on the same ancestor form, owns `defaultValues`, and exposes the imperative API.

**Rejected alternatives:**

- **Shadow-DOM `<form>` inside `<x-form>`.** FACEs walk light-DOM ancestors only — a shadow-tree `<form>` is invisible to them. We'd have to synthesize submission and reset, losing native validation, native submit, and the `formdata` event.
- **Customized built-in (`<form is="x-form">`).** Cleanest semantically (`<x-form>` *is* a form) but Safari lacks native support. A polyfill works but adds a runtime dep, and `is=` syntax confuses authors. Revisit when Safari ships.

### Defaults are a one-shot snapshot

- `defaultValues` (flat dot-prop map; nested object accepted as sugar and flattened on input) is captured into a private frozen field on `connectedCallback`.
- Reassigning the property after init is a **no-op**. Dev-mode warns; production silently ignores. Defaults are immutable for the form's lifetime. Need different defaults? Unmount and remount.
- Rationale: eliminates the "dirty vs pristine re-seed" policy entirely. The question doesn't arise if defaults can't change.

### Element tracking

```ts
class XForm extends HTMLElement {
  #defaults: Record<string, unknown>              // flat dot-prop, frozen
  #seeded = new WeakSet<FormAssociatedElement>()  // seeded-on-first-sight
  #observer: MutationObserver                     // childList + subtree
}
```

- `WeakSet` not `WeakMap` — the only tracked fact is "seeded yet?". WeakSet drops removed elements on GC.
- One predicate, two entry points: initial `connectedCallback` walk and `MutationObserver` `addedNodes` use the same seed routine.

### Seed-on-first-sight

For each newly-observed form-associated descendant not in `#seeded`:

1. Look up its `name` in `#defaults`.
2. *Atom* (`x-input`, `x-checkbox`, `x-switch`, `x-radio`): write `element.defaultValue` and `element.value` (or `checked`).
3. *Composite* (`x-date-range`, `x-address`): collect all keys with the element's `name` as prefix, reconstruct the subtree, call `element.fromFormEntries(subtree)`.
4. Add to `#seeded`.

Late-rendered fields (conditional UI, dynamic lists) seed automatically. Authors do nothing.

### Form-associated element interface

```ts
interface FormAssociatedElement<T = unknown> {
  name: string
  value: T
  defaultValue: T
  dirty: boolean              // flips true on first user-driven change; false on reset
  // composites only — flatten/unflatten their own value
  toFormEntries?(): Record<string, FormDataEntryValue>
  fromFormEntries?(entries: Record<string, FormDataEntryValue>): void
}
```

Atoms skip the `*FormEntries` methods; composites implement them so `<x-form>` stays element-agnostic.

### Imperative API

```ts
form.getValue(path)         // any
form.setValue(path, value)  // silent write — mimics native input.value =
form.getValues()            // → nested object
form.setValues(partial)     // bulk current write; flat or nested
form.reset()                // restore all to snapshot
form.reset(path)            // scoped reset
form.isDirty(path?)         // scoped or whole-form
```

`setValue` writes silently (matches native `input.value = "x"`). Authors who want listeners to react dispatch `input` / `change` themselves — document a helper.

### Read-shape rules (checkbox / radio)

Native `FormData` is flat: each entry is `name → string`, multiple entries with the same name are allowed. `getValues()` shapes that into a typed object. Submission uses native `FormData` exactly — these rules apply only to the read-side aggregation.

| Author markup | `getValues()` shape |
| --- | --- |
| One `x-checkbox name="agree"` (no `value`) | `boolean` |
| One `x-checkbox name="agree" value="yes"` | `"yes" \| undefined` |
| Multiple `x-checkbox name="topics" value="..."` | `string[]` (only checked values) |
| Any `x-checkbox name="topics[]"` | `string[]` — `[]` strips and forces array shape, even with one element |
| `x-radio-group name="size"` containing `x-radio value="..."` | `string \| undefined` |

**Resolution order at `getValues()` time:**

1. Group form-associated descendants by `name`.
2. If `name` ends with `[]`: strip the suffix from the output key and emit `string[]` (filtered to checked).
3. If group has more than one element: emit `string[]` of checked values (matches native `FormData.getAll`).
4. Single `x-checkbox` without `value` attribute: emit `boolean`.
5. Single `x-checkbox` with `value` attribute: emit `string | undefined`.
6. `x-radio-group`: emit the checked element's `value` as `string | undefined`. Always single — radio invariant.

**`defaultValues` mirrors the read shape:**

```ts
{
  "agree": true,                // boolean for valueless checkbox
  "topics[]": ["news", "ads"],  // array — supplied with [] in key
  "size": "m",                  // radio group default
}
```

**Mixed authoring** — e.g. one `x-checkbox name="agree"` plus another `x-checkbox name="agree" value="yes"` — is treated as an authoring mistake. Dev-mode warns; runtime falls through to rule 3 (`string[]`). Don't try to reconcile boolean and value-string semantics — they're incompatible intents.

### Reset semantics

- `form.reset()` and the underlying `<form>.reset()` walk `#seeded` (still-connected elements only) and re-apply the snapshot via the same seed routine. `#seeded` membership is not cleared — reset is rewrite, not re-init.
- Each form-associated element implements `formResetCallback` to restore from its captured `defaultValue`. `<x-form>` triggers reset; the elements do the actual restore.

### Submission

- `<x-form>` mimics native `<form>`: native `submit` event, `submitter`-aware. `onSubmit` callback receives `(values, event)` where `values` is the nested object form of `getValues()`.
- Fields submit via `ElementInternals.setFormValue` per principle 6. Composites pass a `FormData` to `setFormValue` so multiple keys land under the element's `name` prefix.
- Validation hooks here (zod / valibot / native constraint API) — not on individual elements.

### Known limitation: virtualized / re-keyed list rows

If the same logical row unmounts and remounts as a fresh element instance with the same `name`, the new instance gets re-seeded from the snapshot — clobbering the user's edits. Two stances:

1. **Recommended.** Authors stabilize identity — don't unmount rows during edit, just hide them. Matches what every mainstream form lib effectively assumes.
2. **Not shipping.** A parallel `Map<name, currentValue>` cache that survives unmounts. Reinvents controlled state, defeats principle 5. Don't.

Document (1). Reject (2).
