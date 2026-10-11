import { onCleanup } from "@/signals/index.ts";

/**
 * Internal helper for observer wrappers (Intersection/Mutation/Resize).
 * Runs `attach` to start observing, registers `disconnect` with the current
 * scope, and returns a `Disposable`.
 */
export function observe<O extends { disconnect(): void }>(
  obs: O,
  attach: (o: O) => void,
): Disposable {
  attach(obs);
  const cleanup = () => obs.disconnect();
  onCleanup(cleanup);
  return { [Symbol.dispose]: cleanup };
}
