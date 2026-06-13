# Changelog

## 0.19.0

### Added

- **`ui/overlay`** — CSS-first floating layer over native `<dialog>` / Popover API. One `.x-overlay` frame wrapping a `.x-card` surface, positioned by orthogonal primitives: a **location point** (`--overlay-x`/`--overlay-y`, rect-relative lengths to the box center; unset = centered, clamped by CSS so saturated values dock flush to the edges — `--overlay-y: 9999px` *is* "the bottom edge", reactively), explicit **size channels** (`--overlay-w`/`--overlay-h`; a full-width sheet is `--overlay-w: var(--overlay-constraint-width)` — nothing spans edges automatically), a **resize handle side** (`data-resize`: edges `block-start`/`block-end`/`inline-start`/`inline-end`, or a single corner word — a `start`/`end` pair, block side first, e.g. `end-end` — picks the detent axis, the gesture, the affordance, and the enter/exit slide), **`data-draggable`** (boolean x/y move), and modality (how you open it — `showModal()`, `popover`, or `popover="manual"`; no attribute). Everything is expressed in interpolable lengths, so changing the point, the channels, or `data-detent` on an open overlay morphs it with a plain CSS transition. Geometry lives in `ui/overlay/index.css` (required), presentation in `ui/overlay/overlay.css` (imported after). Detents via `data-detent` + `--overlay-detent-*` step the resize axis. Enter/exit animations and top-layer exit are `@supports`-tiered (`@starting-style` / `allow-discrete`, `overlay`, `interpolate-size`) — fully functional without them. The card surface defaults to solid material inside an overlay (frosted opt-in via `data-material-background="translucent"` on the frame). Opt-in `data-overlay-deck` page scale-back recipe.
- **`elements-kit/ui/overlay`** (JS, opt-in) — `createOverlayGestures(overlay, options)`, dispatched by the gesture attributes: an edge `data-resize` word is a whole-surface drag between detents along that axis (RTL-aware, rubber-band past the largest, drag/flick-to-dismiss past the smallest); a corner word (a `start`/`end` pair) is a desktop-window corner resize anchored at the opposite corner (free-form by default — the size persists via `--overlay-w/-h` and the location point shifts by half the growth to pin the anchor; snaps to the width steps when a `detents` option is passed); `data-draggable` moves the surface in x/y from the top strip (the released spot persists via `--overlay-x/-y`, clamped by the same CSS bound; flinging it off the constraint closes). Dismissing restores the author's channel values, so a closed overlay reopens fresh. While attached the factory sets `data-overlay-gestures`, which gates every stylesheet affordance (grabber pills, corner grip) — no drag wiring, no affordance. Text selection is suppressed during drags. `detentchange` CustomEvent, `setDetent()`; cleanup via `onCleanup` scope integration, `dispose()`, or `Symbol.dispose`. First JS module under `src/ui`.
- **Constraint rect** — all overlay geometry derives from four `--overlay-constraint-top/-left/-width/-height` variables (default: the viewport, `sv*` where supported): the location point clamps inside the rect, detents are fractions of it, and the gesture bounds are the rect itself — computed entirely in CSS (`calc`/`min`/`clamp`), so everything re-clamps reactively on viewport or rect changes. `elements-kit/ui/overlay/constrain` exports the opt-in `constrainOverlay(overlay, container)` that syncs a container's rect into the variables via `ResizeObserver`.
- **Storybook** — `storybook/` workspace package (`@storybook/html-vite`) with co-located `src/ui/**/*.stories.@(ts|tsx)` (elements-kit JSX in stories). `pnpm storybook` for local dev; `pnpm build:docs` now bundles the static build into the docs deploy under `/storybook/`.

## 0.9.0

Port upstream [stackblitz/alien-signals](https://github.com/stackblitz/alien-signals) fixes shipped after v3.1.2.

### Fixed

- `checkDirty` is now resilient to graph mutations performed inside `update()` callbacks — disposing an effect or scope from a getter no longer crashes the dirty walk. ([upstream PRs #109 / #110](https://github.com/stackblitz/alien-signals/pull/110))
- `effectScope` now participates in propagation: an outer effect responds to changes from signals **and** computeds read inside a nested scope. Previously signals walked up to the parent effect while computeds linked to the inert scope, so the effect could miss computed updates. ([upstream PR #111, issue #105](https://github.com/stackblitz/alien-signals/pull/111))
- A write performed inside an effect's body no longer blocks future propagation through a downstream computed chain — the new `runDepth` / `innerWrite` propagation correctly marks affected subscribers `Recursed | Pending`. ([upstream PR #112, issue #99](https://github.com/stackblitz/alien-signals/pull/112))
- After an inner effect re-runs on its own dep, the outer effect keeps responding to its own deps. The post-checkDirty branch in `run()` now uses `e.deps !== undefined` (was `e.flags`) to distinguish "touched by notify chain" from "fully disposed". ([upstream issue #115](https://github.com/stackblitz/alien-signals/issues/115))

### Changed (behavioural)

- **Disposal order is now LIFO, depth-first reverse.** Child effects and scopes dispose *before* their parent's `onCleanup` callbacks fire, and siblings dispose in reverse creation order. Same ordering applies on effect re-run. See [ARCHITECTURE.md §6](ARCHITECTURE.md). Code that depended on the previous "parent cleanup first" order needs to be re-checked. ([upstream PR #116](https://github.com/stackblitz/alien-signals/pull/116))

### Internal

- `trigger()` hoists the active-sub flag reset out of its unlink loop. ([upstream fb17aed](https://github.com/stackblitz/alien-signals/commit/fb17aed))
- New gate bit `HasChildEffect` (outside `ReactiveFlags`) lets leaf effects skip the dispose-children-first walk in `run` / `updateComputed`. ([upstream PR #116](https://github.com/stackblitz/alien-signals/pull/116))

### Skipped from upstream

- `effect(fn => () => cleanup)` cleanup-return API — the local `onCleanup(fn)` callback registry is a superset (multi-cleanup, registration from helpers, scope/computed support).
- `runCleanup()` helper extraction — the local code already runs cleanups through `untracked(...)`, giving the same "no tracking-context leak" guarantee.
