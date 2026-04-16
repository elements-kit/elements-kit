import { type Signal, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Returns a `Signal<T>` that stays in sync across browser tabs via the
 * `storage` event.  Writing the signal updates `localStorage` and
 * notifies other tabs.
 *
 * Unlike `createPersistedState`, this **reacts** to changes made in other
 * tabs/windows.
 *
 * @param key - The `localStorage` key.
 * @param initialValue - Fallback when nothing is stored yet.
 * @param options.storage - Storage backend (default `localStorage`).
 * @param options.serialise - Custom serialiser (default `JSON.stringify`).
 * @param options.deserialise - Custom deserialiser (default `JSON.parse`).
 */
export function createStorageEvent<T>(
  key: string,
  initialValue: T,
  options?: {
    storage?: Storage;
    serialise?: (value: T) => string;
    deserialise?: (raw: string) => T;
  },
): Signal<T> {
  const {
    storage = typeof localStorage !== "undefined"
      ? localStorage
      : (undefined as unknown as Storage),
    serialise = (v: T) => JSON.stringify(v),
    deserialise = (raw: string) => JSON.parse(raw) as T,
  } = options ?? {};

  let current: T = initialValue;
  if (storage) {
    try {
      const stored = storage.getItem(key);
      if (stored !== null) current = deserialise(stored);
    } catch {
      /* unavailable */
    }
  }

  const s = signal<T>(current);

  // Persist on write by intercepting the signal.
  const originalSet = s as (value: T) => void;
  const wrapped: Signal<T> = ((...args: [] | [T]) => {
    if (args.length === 0) return s();
    const value = args[0];
    originalSet(value);
    if (storage) {
      try {
        storage.setItem(key, serialise(value));
      } catch {
        /* quota exceeded */
      }
    }
  }) as Signal<T>;

  // Listen for cross-tab changes.
  createEventListener(window, "storage", (e: StorageEvent) => {
    if (e.key !== key || e.storageArea !== storage) return;
    if (e.newValue === null) {
      s(initialValue);
    } else {
      try {
        s(deserialise(e.newValue));
      } catch {
        /* ignore parse errors */
      }
    }
  });

  return wrapped;
}
