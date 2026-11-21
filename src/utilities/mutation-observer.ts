import { observe } from "./_observe.ts";

/**
 * Watches `target` (element, shadow root, document — any `Node`) for DOM
 * mutations and calls `callback` with each batch of `MutationRecord`s.
 */
export function createMutationObserver(
  target: Node,
  options: MutationObserverInit,
  callback: (records: MutationRecord[]) => void,
): Disposable {
  return observe(new MutationObserver((records) => callback(records)), (o) => {
    if (target) o.observe(target, options);
  });
}
