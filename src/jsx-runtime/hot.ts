import { effect, onCleanup, signal, type Signal } from "../signals";
import { Slot } from "../slot";
import { HMR_CELLS_SLOT, HMR_SLOT } from "../integrations/hmr-slot";
import { createElement } from "./element";
import { getRenderer } from "./renderer";
import type { JSX } from ".";

/**
 * Dev-only component indirection behind `elements-kit/jsx-dev-runtime`.
 *
 * Every component render goes through a **cell** — a signal holding the
 * component's current implementation — rendered into a {@link Slot}. Pointing
 * a cell at a new function re-runs one effect, which disposes that subtree and
 * builds the replacement. Nothing else on the page is touched, so a parent's
 * signals survive an edit to its child.
 *
 * That leaves the reactive graph owning the swap: no registry of live
 * instances, no parent-before-child ordering, and no bookkeeping to prune when
 * a subtree is discarded.
 *
 * Production builds import `jsx`/`jsxs` from `elements-kit/jsx-runtime` and
 * never load this module.
 */

type ComponentCell = Signal<unknown>;

// On `globalThis` so duplicate module copies (dev pre-bundling, mixed chunks)
// share one map — a swap must reach cells created by the other copy.
const store = globalThis as Record<symbol, WeakMap<object, ComponentCell>>;
const cells: WeakMap<object, ComponentCell> = (store[HMR_CELLS_SLOT] ??=
  new WeakMap());

function cellFor(type: object): ComponentCell {
  let cell = cells.get(type);
  if (cell === undefined) {
    cell = signal<unknown>(type);
    cells.set(type, cell);
  }
  return cell;
}

/**
 * `createElement` with a hot-swappable component boundary. Intrinsic elements
 * and non-DOM renderers fall straight through.
 */
export function createHotElement(
  type: JSX.ElementType,
  allProps: { ref?: (el: Element) => void } & Record<string, unknown> = {},
): JSX.Element | null {
  // A renderer means the server or hydrate pass is active; both return
  // non-DOM values that a Slot can't hold, and neither is ever hot-swapped.
  //
  // An empty registry means no module got an accept boundary, so no swap can
  // ever be triggered and the indirection would be pure cost — the case for
  // any dev environment without the Vite plugin (an in-browser sandbox, say).
  // The plugin's injected import loads the registry at module scope, ahead of
  // the first render, so this is settled by the time anything mounts.
  if (
    typeof type !== "function" ||
    getRenderer() ||
    !(globalThis as Record<symbol, unknown>)[HMR_SLOT]
  ) {
    return createElement(type, allProps);
  }

  const cell = cellFor(type);
  const slot = new Slot();

  effect(() => {
    const node = createElement(cell() as JSX.ElementType, allProps);
    // Read the disposer before `set`: inserting a DocumentFragment moves its
    // children out and leaves the fragment — and its `Symbol.dispose` — empty,
    // so `Slot.clear` would never find the component's scope.
    const dispose = (node as unknown as Partial<Disposable>)?.[Symbol.dispose];
    if (node) slot.set(node);
    else slot.set();
    if (dispose) onCleanup(dispose);
  });
  onCleanup(() => slot.clear());

  // Both element paths wrap the component call in `untracked`, so nothing the
  // component reads becomes a dependency of the effect above — only the cell.
  return slot.get();
}

/**
 * Re-point the cells of every component the changed module exports. Returns
 * whether any cell belonged to this module, which tells the caller whether the
 * update was handled or has to fall back to a reload.
 */
export function updateCells(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  let updated = false;

  for (const key of Object.keys(prev)) {
    const Prev = prev[key];
    const Next = next[key];
    if (typeof Prev !== "function" || typeof Next !== "function") continue;

    const cell = cells.get(Prev);
    if (cell === undefined) continue;
    updated = true;
    if (Next === Prev) continue;

    // Re-key first: the next edit arrives holding `Next` as its previous
    // export and has to find this same cell.
    cells.set(Next, cell);
    cell(Next);
  }

  return updated;
}
