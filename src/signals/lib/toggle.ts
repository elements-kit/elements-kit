import { type Signal, signal } from "../index.ts";

type ToggleResult = Signal<boolean> & {
  toggle(): void;
};

/**
 * Returns a boolean `Signal` with an additional `toggle()` helper.
 */
export function createToggle(initial = false): ToggleResult {
  const s = signal(initial);
  const toggle = () => s(!s());
  return Object.assign(s, { toggle });
}
