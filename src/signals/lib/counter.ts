import { type Signal, signal } from "../index.ts";

type CounterResult = Signal<number> & {
  increment(step?: number): void;
  decrement(step?: number): void;
  reset(): void;
};

/**
 * Returns a numeric `Signal` with `increment`, `decrement`, and `reset`
 * helpers.  Optionally clamp to `[min, max]`.
 */
export function createCounter(
  initial = 0,
  options?: { min?: number; max?: number },
): CounterResult {
  const { min = -Infinity, max = Infinity } = options ?? {};

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const s = signal(clamp(initial));

  const increment = (step = 1) => s(clamp(s() + step));
  const decrement = (step = 1) => s(clamp(s() - step));
  const reset = () => s(clamp(initial));

  return Object.assign(s, { increment, decrement, reset });
}
