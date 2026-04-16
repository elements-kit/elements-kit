import { type Computed, signal } from "../index.ts";

type QueueResult<T> = {
  items: Computed<readonly T[]>;
  add(item: T): void;
  remove(): T | undefined;
  peek(): T | undefined;
  clear(): void;
  size: Computed<number>;
};

/**
 * Reactive FIFO queue.
 */
export function createQueue<T>(initial: T[] = []): QueueResult<T> {
  const s = signal<readonly T[]>([...initial]);

  const add = (item: T) => s([...s(), item]);
  const remove = () => {
    const arr = [...s()];
    const first = arr.shift();
    s(arr);
    return first;
  };
  const peek = () => s()[0];
  const clear = () => s([]);
  const size = () => s().length;

  return {
    items: s as Computed<readonly T[]>,
    add,
    remove,
    peek,
    clear,
    size: size as Computed<number>,
  };
}
