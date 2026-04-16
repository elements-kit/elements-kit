import { type Signal, effect, signal } from "../index.ts";

/**
 * Returns a writable `Signal<string>` synced to `document.title`.
 * Writing the signal immediately updates the browser tab title.
 */
export function createDocumentTitle(initial?: string): Signal<string> {
  const title = signal<string>(
    initial ?? (typeof document !== "undefined" ? document.title : ""),
  );

  effect(() => {
    if (typeof document !== "undefined") {
      document.title = title();
    }
  });

  return title;
}
