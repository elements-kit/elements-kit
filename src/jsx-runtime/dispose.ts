export type Disposer = () => void;

const DISPOSABLES = new WeakMap<object, Set<Disposer>>();

const sharedDispose = function (this: object) {
  const set = DISPOSABLES.get(this);
  if (!set) return;
  DISPOSABLES.delete(this);
  set.forEach((fn) => fn());
  set.clear();
};

export function attachDisposables(
  target: Element | DocumentFragment,
  disposers: Set<Disposer>,
): void {
  const existing = DISPOSABLES.get(target);
  if (existing) {
    disposers.forEach((d) => existing.add(d));
    return;
  }
  DISPOSABLES.set(target, disposers);
  // Bind here so callers that extract `node[Symbol.dispose]` and invoke later
  // (e.g. mountChild stashing it in onCleanup) still resolve `this` correctly.
  // Bound functions are smaller than closures — no captured environment.
  Object.defineProperty(target, Symbol.dispose, {
    value: sharedDispose.bind(target),
    configurable: true,
  });
}
