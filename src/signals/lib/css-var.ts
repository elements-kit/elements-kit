import { type Signal, effect, signal } from "../index.ts";

/**
 * Returns a writable `Signal<string>` bound to a CSS custom property on
 * `target` (defaults to `document.documentElement`).
 *
 * Reading the signal returns the current value from `getComputedStyle`.
 * Writing the signal calls `style.setProperty`.
 *
 * @param name - The CSS custom property name (e.g. `--accent`).
 * @param initialValue - Seed value (if omitted, reads from the element).
 * @param target - The element to read/write the property on.
 */
export function createCSSVar(
  name: string,
  initialValue?: string,
  target: HTMLElement = document.documentElement,
): Signal<string> {
  const read = () => getComputedStyle(target).getPropertyValue(name).trim();

  const s = signal(initialValue ?? read());

  effect(() => {
    target.style.setProperty(name, s());
  });

  return s;
}
