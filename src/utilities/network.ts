import { type Computed, signal } from "@/signals/index.ts";
import { on } from "./event-listener.ts";
import { isBrowser } from "./environment.ts";

function createOnline(): Computed<boolean> {
  if (!isBrowser) {
    return signal(true) as Computed<boolean>;
  }
  const value = signal(navigator.onLine);
  const update = () => value(navigator.onLine);
  on(window, "online", update);
  on(window, "offline", update);
  return value as Computed<boolean>;
}

/**
 * Singleton `Computed<boolean>` — `true` when `navigator.onLine` is true.
 * Reacts to `online` / `offline` window events. Outside a browser, always `true`.
 */
export const online: Computed<boolean> = createOnline();
