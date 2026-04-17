import type { Signal } from "../signals/index.ts";
import { type Subscribe, sync } from "./event-driven.ts";

type StorageOptions<T> = {
  /** Custom serialiser (default `JSON.stringify`). */
  serialise?: (value: T) => string;
  /** Custom deserialiser (default `JSON.parse`). */
  deserialise?: (raw: string) => T;
};

function readOrDefault<T>(
  storage: Storage,
  key: string,
  initialValue: T,
  deserialise: (raw: string) => T,
): T {
  try {
    const item = storage.getItem(key);
    if (item !== null) return deserialise(item);
  } catch {
    /* storage unavailable or parse error */
  }
  return initialValue;
}

/**
 * Returns a `Signal` persisted to `localStorage`.
 *
 * Changes made in other tabs/windows are synchronised automatically via
 * the `StorageEvent`.
 */
export function createLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: StorageOptions<T>,
): Signal<T> {
  const serialise = options?.serialise ?? ((v: T) => JSON.stringify(v));
  const deserialise =
    options?.deserialise ?? ((raw: string) => JSON.parse(raw) as T);

  const storage = localStorage;

  // StorageEvent only fires in *other* tabs, so we need a manual notify
  // to trigger a re-read after same-tab writes.
  let notify: (() => void) | undefined;
  const subscribe: Subscribe = (cb) => {
    notify = cb;
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === storage) cb();
    };
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("storage", handler);
      notify = undefined;
    };
  };

  const [s] = sync(
    subscribe,
    () => readOrDefault(storage, key, initialValue, deserialise),
    (v) => {
      try {
        storage.setItem(key, serialise(v));
      } catch {
        /* quota exceeded */
      }
      notify?.();
    },
  );

  return s;
}

/**
 * Returns a `Signal` persisted to `sessionStorage`.
 *
 * Session storage is scoped to the current tab — no cross-tab sync.
 */
export function createSessionStorage<T>(
  key: string,
  initialValue: T,
  options?: StorageOptions<T>,
): Signal<T> {
  const serialise = options?.serialise ?? ((v: T) => JSON.stringify(v));
  const deserialise =
    options?.deserialise ?? ((raw: string) => JSON.parse(raw) as T);

  const storage = sessionStorage;

  let notify: (() => void) | undefined;
  const subscribe: Subscribe = (cb) => {
    notify = cb;
    return () => {
      notify = undefined;
    };
  };

  const [s] = sync(
    subscribe,
    () => readOrDefault(storage, key, initialValue, deserialise),
    (v) => {
      try {
        storage.setItem(key, serialise(v));
      } catch {
        /* quota exceeded */
      }
      notify?.();
    },
  );

  return s;
}
