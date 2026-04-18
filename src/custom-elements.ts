export { defineElement, type CustomElementRegistry } from "./define";
import { effectScope, untracked } from "./signals";

/**
 * Runs `setup` inside a fresh `effectScope` and returns both its result and
 * the scope's dispose handle.
 *
 * Use this wherever you need to run reactive code with an explicit lifetime
 * outside the JSX element flow — most commonly inside a custom element's
 * `connectedCallback`. `onCleanup`, nested `effect`s and any other
 * scope-bound registrations made in `setup` are owned by the returned
 * `dispose`.
 *
 * `untracked` detaches the new scope from any enclosing effect so it isn't
 * torn down when that effect re-runs — its lifetime is solely the caller's
 * responsibility.
 *
 * @example
 * ```ts
 * class Clock extends HTMLElement {
 *   #dispose?: () => void;
 *
 *   connectedCallback() {
 *     const { dispose } = renderScope(() => {
 *       const id = setInterval(() => (this.textContent = String(Date.now())), 1000);
 *       onCleanup(() => clearInterval(id));
 *     });
 *     this.#dispose = dispose;
 *   }
 *
 *   disconnectedCallback() {
 *     this.#dispose?.();
 *     this.#dispose = undefined;
 *   }
 * }
 * ```
 */
export function renderScope<T>(setup: () => T): {
  result: T;
  dispose: () => void;
} {
  let result!: T;
  let dispose!: () => void;
  untracked(() => {
    dispose = effectScope(() => {
      result = setup();
    });
  });
  return { result, dispose };
}

const scopes = new WeakMap<HTMLElement, () => void>();

/**
 * Runs `setup` inside an `effectScope` tied to `el`'s connected lifetime.
 *
 * Call from `connectedCallback`. Effects, `onCleanup` registrations, and
 * reactive reads inside `setup` belong to this scope. Pair with
 * {@link disconnectedScope} from `disconnectedCallback` to dispose.
 *
 * Safe to call more than once (e.g. if the element is reconnected after
 * disconnection): the previous scope is disposed first.
 *
 * @example
 * ```ts
 * class Clock extends HTMLElement {
 *   connectedCallback() {
 *     connectedScope(this, () => {
 *       const id = setInterval(() => this.textContent = String(Date.now()), 1000);
 *       onCleanup(() => clearInterval(id));
 *     });
 *   }
 *   disconnectedCallback() {
 *     disconnectedScope(this);
 *   }
 * }
 * ```
 */
export function connectedScope(el: HTMLElement, setup: () => void): void {
  scopes.get(el)?.(); // dispose prior scope (safe if element is reconnected)
  const { dispose } = renderScope(setup);
  scopes.set(el, dispose);
}

/**
 * Disposes the scope previously created by {@link connectedScope} for `el`.
 * No-op if there is no active scope.
 */
export function disconnectedScope(el: HTMLElement): void {
  scopes.get(el)?.();
  scopes.delete(el);
}
