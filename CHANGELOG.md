# Changelog

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
