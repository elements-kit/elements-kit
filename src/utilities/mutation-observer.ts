import { observe } from "./_observe.ts";

/**
 * Watches `target` for DOM mutations and calls `callback` with each batch of
 * `MutationRecord`s.
 */
export function createMutationObserver(
  target: Element,
  options: MutationObserverInit,
  callback: (records: MutationRecord[]) => void,
): Disposable {
  return observe(new MutationObserver((records) => callback(records)), (o) => {
    if (target) o.observe(target, options);
  });
}
