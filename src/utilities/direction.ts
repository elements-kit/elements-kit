import { type Computed, computed, onCleanup, signal } from "@/signals/index.ts";
import { isBrowser } from "./environment.ts";
import { createMutationObserver } from "./mutation-observer.ts";

export type Direction = "ltr" | "rtl";

/**
 * The page's direction — the document root's resolved `direction`
 * (`"ltr"` / `"rtl"`), reactive. `direction` below is the
 * pre-instantiated page singleton, like `windowSize` / `online`.
 *
 * Resyncs on `dir` attribute changes anywhere in the document (the
 * mechanism locale switches use; `direction` inherits, so ancestor
 * flips count). A stylesheet-driven `direction` change has no
 * observable primitive — it's picked up on the next `dir` mutation.
 * Outside a browser: a constant `"ltr"`.
 *
 * @example
 * ```ts
 * import { direction } from "elements-kit/utilities/direction";
 *
 * effect(() => {
 *   panel.dataset.dir = direction(); // re-runs on <html dir> changes
 * });
 * ```
 */
export function createDirection(
  element?: Element,
): Computed<Direction> & Disposable {
  if (!isBrowser) {
    return Object.assign(
      computed((): Direction => "ltr"),
      { [Symbol.dispose]() {} },
    );
  }
  const target = element ?? document.documentElement;
  const read = (): Direction =>
    getComputedStyle(target).direction === "rtl" ? "rtl" : "ltr";
  const current = signal(read());
  const observer = createMutationObserver(
    document.documentElement,
    { attributes: true, attributeFilter: ["dir"], subtree: true },
    () => current(read()),
  );

  onCleanup(() => observer[Symbol.dispose]());
  return Object.assign(
    computed(() => current()),
    { [Symbol.dispose]: () => observer[Symbol.dispose]() },
  );
}

/** The page's direction — the document root's, reactive. */
export const direction = createDirection();
