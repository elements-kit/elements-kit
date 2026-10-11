import { type Computed, signal } from "@/signals/index.ts";
import { on } from "./event-listener.ts";
import { isBrowser } from "./environment.ts";

function createWindowFocused(): Computed<boolean> {
  if (!isBrowser) {
    return signal(true) as Computed<boolean>;
  }
  const value = signal(document.hasFocus());
  on(window, "focus", () => value(true));
  on(window, "blur", () => value(false));
  return value as Computed<boolean>;
}

/**
 * Singleton `Computed<boolean>` — `true` while the browser window has focus.
 * Reacts to `focus` / `blur` window events. Outside a browser, always `true`.
 */
export const windowFocused: Computed<boolean> = createWindowFocused();
