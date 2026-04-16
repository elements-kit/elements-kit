import { type Computed, signal } from "../index.ts";

type ListResult<T> = {
  items: Computed<readonly T[]>;
  push(...items: T[]): void;
  pop(): T | undefined;
  remove(index: number): void;
  filter(fn: (item: T, index: number) => boolean): void;
  set(items: T[]): void;
  clear(): void;
  size: Computed<number>;
};

/**
 * Reactive array with mutation helpers.
 */
export function createList<T>(initial: T[] = []): ListResult<T> {
  const items = signal<readonly T[]>([...initial]);

  const push = (...newItems: T[]) => items([...items(), ...newItems]);
  const pop = () => {
    const arr = [...items()];
    const last = arr.pop();
    items(arr);
    return last;
  };
  const remove = (index: number) => {
    const arr = [...items()];
    arr.splice(index, 1);
    items(arr);
  };
  const filter = (fn: (item: T, index: number) => boolean) =>
    items(items().filter(fn));
  const set = (next: T[]) => items([...next]);
  const clear = () => items([]);
  const size = () => items().length;

  return {
    items: items as Computed<readonly T[]>,
    push,
    pop,
    remove,
    filter,
    set,
    clear,
    size: size as Computed<number>,
  };
}
