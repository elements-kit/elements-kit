import { onCleanup } from "@/signals/index.ts";

/**
 * Watches `target` for DOM mutations and calls `callback` with each batch of
 * `MutationRecord`s.
 */
export function createMutationObserver(
  target: Element,
  options: MutationObserverInit,
  callback: (records: MutationRecord[]) => void,
): Disposable {
  const observer = new MutationObserver((records) => callback(records));

  const el = target;
  if (el) observer.observe(el, options);

  const cleanup = () => observer.disconnect();
  onCleanup(cleanup);

  return { [Symbol.dispose]: cleanup };
}
