import { type Computed, signal } from "@/signals/index.ts";
import { on } from "./event-listener.ts";

function createWindowFocused(): Computed<boolean> {
  const value = signal(typeof document !== "undefined" ? document.hasFocus() : true);
  on(window, "focus", () => value(true));
  on(window, "blur", () => value(false));
  return value as Computed<boolean>;
}

/**
 * Singleton `Computed<boolean>` — `true` while the browser window has focus.
 * Reacts to `focus` / `blur` window events.
 */
export const windowFocused: Computed<boolean> = createWindowFocused();
