import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Returns a `Computed<ReadonlySet<string>>` containing all keyboard keys
 * currently being held down.  Key values follow the `KeyboardEvent.key` spec.
 */
export function createPressedKeys(): Computed<ReadonlySet<string>> {
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

  createEventListener(window, "keydown", onKeyDown);
  createEventListener(window, "keyup", onKeyUp);
  createEventListener(window, "blur", onBlur);

  return keys as Computed<ReadonlySet<string>>;
}
