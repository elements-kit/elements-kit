import { type Signal, signal } from "../signals/index.ts";
import { isBrowser } from "./environment.ts";
import { type Subscribe, sync } from "./event-driven.ts";

type StorageOptions<T> = {
  /** Custom serialiser (default `JSON.stringify`). */
  serialise?: (value: T) => string;
  /** Custom deserialiser (default `JSON.parse`). */
  deserialise?: (raw: string) => T;
};

/**
 * The requested `Storage`, or `null` outside a browser and when access throws
 * (sandboxed iframes, blocked site data).
 */
function getStorage(area: "local" | "session"): Storage | null {
  if (!isBrowser) return null;
  try {
    return area === "local" ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

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

function createStorageSignal<T>(
  area: "local" | "session",
  key: string,
  initialValue: T,
  options: StorageOptions<T> | undefined,
  crossTab: boolean,
): Signal<T> {
  const storage = getStorage(area);
  // No storage (SSR, blocked) — degrade to a plain in-memory signal.
  if (!storage) return signal(initialValue);

  const serialise = options?.serialise ?? ((v: T) => JSON.stringify(v));
  const deserialise =
    options?.deserialise ?? ((raw: string) => JSON.parse(raw) as T);

  // StorageEvent only fires in *other* tabs, so we need a manual notify
  // to trigger a re-read after same-tab writes.
  let notify: (() => void) | undefined;
  const subscribe: Subscribe = (cb) => {
    notify = cb;
    if (!crossTab) {
      return () => {
        notify = undefined;
      };
    }
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
 * Returns a `Signal` persisted to `localStorage`.
 *
 * Changes made in other tabs/windows are synchronised automatically via
 * the `StorageEvent`.
 *
 * Outside a browser — or when `localStorage` is unavailable — the signal is
 * plain in-memory state seeded with `initialValue`; nothing is persisted.
 *
 * @example
 * ```ts
 * import { createLocalStorage } from "elements-kit/utilities/storage";
 *
 * const theme = createLocalStorage<"light" | "dark">("theme", "light");
 * theme();         // read current
 * theme("dark");   // write — persists and notifies
 * ```
 */
export function createLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: StorageOptions<T>,
): Signal<T> {
  return createStorageSignal("local", key, initialValue, options, true);
}

/**
 * Returns a `Signal` persisted to `sessionStorage`.
 *
 * Session storage is scoped to the current tab — no cross-tab sync.
 *
 * Outside a browser — or when `sessionStorage` is unavailable — the signal is
 * plain in-memory state seeded with `initialValue`; nothing is persisted.
 *
 * @example
 * ```ts
 * import { createSessionStorage } from "elements-kit/utilities/storage";
 *
 * const draft = createSessionStorage("draft", { title: "", body: "" });
 * draft({ title: "hi", body: "…" });
 * ```
 */
export function createSessionStorage<T>(
  key: string,
  initialValue: T,
  options?: StorageOptions<T>,
): Signal<T> {
  return createStorageSignal("session", key, initialValue, options, false);
}
