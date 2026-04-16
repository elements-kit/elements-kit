import { type Signal, onCleanup, signal } from "../index.ts";

/**
 * Returns a writable `Signal<string>` that stays in sync with `location.hash`
 * (including the leading `#`).  Writing the signal updates `location.hash`.
 */
export function createHash(): Signal<string> & Disposable {
  const hash = signal(typeof location !== "undefined" ? location.hash : "");

  const onHashChange = () => hash(location.hash);

  window.addEventListener("hashchange", onHashChange);

  const cleanup = () => window.removeEventListener("hashchange", onHashChange);
  onCleanup(cleanup);

  // Override the setter so writing also updates the real hash.
  const proxy = (value?: string) => {
    if (value === undefined) return hash();
    location.hash = value;
    hash(value);
  };

  return Object.assign(proxy as Signal<string>, {
    [Symbol.dispose]: cleanup,
  });
}
