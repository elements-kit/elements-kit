import { type Computed, onCleanup, signal } from "../index.ts";

/**
 * Returns a `Computed` that tracks `document.activeElement`.
 * Updates on every `focusin` / `focusout` event bubbling through the document.
 */
export function createActiveElement(): Computed<Element | null> & Disposable {
  const active = signal<Element | null>(
    typeof document !== "undefined" ? document.activeElement : null,
  );

  const update = () => active(document.activeElement);

  document.addEventListener("focusin", update);
  document.addEventListener("focusout", update);

  const cleanup = () => {
    document.removeEventListener("focusin", update);
    document.removeEventListener("focusout", update);
  };
  onCleanup(cleanup);

  return Object.assign(active as Computed<Element | null>, {
    [Symbol.dispose]: cleanup,
  });
}
