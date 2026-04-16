import { type Computed, onCleanup, signal } from "../index.ts";

/**
 * Returns a `Computed<number>` containing `Date.now()`, updated every
 * animation frame.  Useful for elapsed-time displays or animation drivers.
 */
export function createTimestamp(): Computed<number> {
  const ts = signal(Date.now());
  let id: number;

  const tick = () => {
    ts(Date.now());
    id = requestAnimationFrame(tick);
  };

  id = requestAnimationFrame(tick);
  onCleanup(() => cancelAnimationFrame(id));

  return ts as Computed<number>;
}
