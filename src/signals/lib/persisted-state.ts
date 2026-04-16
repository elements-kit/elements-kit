import { type Signal, effect, signal } from "../index.ts";

/**
 * Returns a `Signal` whose value is persisted to `storage` (defaults to
 * `localStorage`).  On creation the stored value is read back; on every
 * change the new value is serialised with `JSON.stringify`.
 */
export function createPersistedState<T>(
  key: string,
  initialValue: T,
  storage: Storage = typeof localStorage !== "undefined"
    ? localStorage
    : (undefined as unknown as Storage),
): Signal<T> {
  let stored: T = initialValue;

  if (storage) {
    try {
      const item = storage.getItem(key);
      if (item !== null) stored = JSON.parse(item) as T;
    } catch {
      // storage unavailable or JSON parse error — fall back to initialValue
    }
  }

  const s = signal<T>(stored);

  effect(() => {
    const val = s();
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(val));
    } catch {
      // storage quota exceeded or unavailable
    }
  });

  return s;
}
