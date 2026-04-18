import { effectScope, untracked } from "./lib";

/**
 * Run `setup` inside a fresh `effectScope`. Returns `[result, stop]`.
 *
 * Use this wherever you need reactive code with an explicit lifetime outside
 * the JSX element flow — most commonly a custom element's `connectedCallback`.
 * `effect`, `onCleanup`, and any nested reactive registrations made in
 * `setup` are owned by the returned `stop`.
 *
 * `untracked` detaches the new scope from any enclosing effect so it isn't
 * torn down when that effect re-runs — its lifetime belongs solely to the
 * caller.
 *
 * @example
 * ```ts
 * class Clock extends HTMLElement {
 *   #stop?: () => void;
 *
 *   connectedCallback() {
 *     [, this.#stop] = scope(() => {
 *       const id = setInterval(() => (this.textContent = String(Date.now())), 1000);
 *       onCleanup(() => clearInterval(id));
 *     });
 *   }
 *
 *   disconnectedCallback() {
 *     this.#stop?.();
 *     this.#stop = undefined;
 *   }
 * }
 * ```
 */
export function scope<T>(setup: () => T): [T, () => void] {
  let result!: T;
  let stop!: () => void;
  untracked(() => {
    stop = effectScope(() => {
      result = setup();
    });
  });
  return [result, stop];
}
