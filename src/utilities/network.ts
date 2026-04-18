import { type Computed, signal } from "@/signals/index.ts";
import { on } from "./event-listener.ts";

function createOnline(): Computed<boolean> {
  const value = signal(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const update = () => value(navigator.onLine);
  on(window, "online", update);
  on(window, "offline", update);
  return value as Computed<boolean>;
}

/**
 * Singleton `Computed<boolean>` — `true` when `navigator.onLine` is true.
 * Reacts to `online` / `offline` window events.
 */
export const online: Computed<boolean> = createOnline();
