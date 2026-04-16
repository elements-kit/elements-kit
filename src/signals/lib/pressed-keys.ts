import { type Computed, onCleanup, signal } from "../index.ts";

/**
 * Returns a `Computed<ReadonlySet<string>>` containing all keyboard keys
 * currently being held down.  Key values follow the `KeyboardEvent.key` spec.
 */
export function createPressedKeys(): Computed<ReadonlySet<string>> &
  Disposable {
  const keys = signal<ReadonlySet<string>>(new Set());

  const onKeyDown = (e: KeyboardEvent) => {
    const next = new Set(keys());
    next.add(e.key);
    keys(next);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const next = new Set(keys());
    next.delete(e.key);
    keys(next);
  };

  // Clear all keys when window loses focus so stale keys don't get stuck.
  const onBlur = () => keys(new Set());

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  const cleanup = () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  };
  onCleanup(cleanup);

  return Object.assign(keys as Computed<ReadonlySet<string>>, {
    [Symbol.dispose]: cleanup,
  });
}
