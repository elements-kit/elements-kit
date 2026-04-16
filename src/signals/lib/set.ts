import { type Computed, signal } from "../index.ts";

type ReactiveSetResult<T> = {
  entries: Computed<ReadonlySet<T>>;
  add(value: T): void;
  remove(value: T): void;
  toggle(value: T): void;
  has(value: T): boolean;
  clear(): void;
  size: Computed<number>;
};

/**
 * Reactive `Set` with mutation helpers.
 */
export function createSet<T>(initial?: Set<T>): ReactiveSetResult<T> {
  const s = signal<ReadonlySet<T>>(new Set(initial));

  const add = (value: T) => {
    const next = new Set(s());
    next.add(value);
    s(next);
  };
  const remove = (value: T) => {
    const next = new Set(s());
    next.delete(value);
    s(next);
  };
  const toggle = (value: T) => {
    const next = new Set(s());
    if (next.has(value)) next.delete(value);
    else next.add(value);
    s(next);
  };
  const has = (value: T) => s().has(value);
  const clear = () => s(new Set());
  const size = () => s().size;

  return {
    entries: s as Computed<ReadonlySet<T>>,
    add,
    remove,
    toggle,
    has,
    clear,
    size: size as Computed<number>,
  };
}
