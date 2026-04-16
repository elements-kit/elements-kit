import { type Computed, signal } from "../index.ts";

type ReactiveMapResult<K, V> = {
  entries: Computed<ReadonlyMap<K, V>>;
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  delete(key: K): void;
  has(key: K): boolean;
  clear(): void;
  size: Computed<number>;
};

/**
 * Reactive `Map` with mutation helpers.
 */
export function createMap<K, V>(initial?: Map<K, V>): ReactiveMapResult<K, V> {
  const s = signal<ReadonlyMap<K, V>>(new Map(initial));

  const get = (key: K) => s().get(key);
  const set = (key: K, value: V) => {
    const next = new Map(s());
    next.set(key, value);
    s(next);
  };
  const del = (key: K) => {
    const next = new Map(s());
    next.delete(key);
    s(next);
  };
  const has = (key: K) => s().has(key);
  const clear = () => s(new Map());
  const size = () => s().size;

  return {
    entries: s as Computed<ReadonlyMap<K, V>>,
    get,
    set,
    delete: del,
    has,
    clear,
    size: size as Computed<number>,
  };
}
