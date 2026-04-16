import { effect, onCleanup } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Traps keyboard focus within `target`.  While active, pressing `Tab` or
 * `Shift+Tab` cycles through the focusable elements inside the container
 * instead of leaving it.
 *
 * Restores the previously focused element when disposed.
 *
 * @param target - The container element (or reactive getter).
 */
export function createFocusTrap(
  target: HTMLElement | (() => HTMLElement | null),
): Disposable {
  const el = typeof target === "function" ? target() : target;
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const getFocusable = (): HTMLElement[] =>
    el ? Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

  const cleanups: Array<() => void> = [];

  if (el) {
    // Focus the first focusable element (or the container itself).
    const initial = getFocusable();
    if (initial.length > 0) {
      initial[0].focus();
    } else {
      el.setAttribute("tabindex", "-1");
      el.focus();
    }

    cleanups.push(
      createEventListener(el, "keydown", (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        const focusable = getFocusable();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }),
    );
  }

  const cleanup = () => {
    cleanups.forEach((fn) => fn());
    previouslyFocused?.focus();
  };
  onCleanup(cleanup);

  return { [Symbol.dispose]: cleanup };
}
