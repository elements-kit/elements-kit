export * from "alien-signals";
import {
  isSignal,
  isComputed,
  signal,
  setActiveSub,
  startBatch,
  endBatch,
} from "alien-signals";
import type { ValueOrReactive } from "./core";

export function isReactive<T>(value: ValueOrReactive<T>): value is () => T {
  return isSignal(value as () => T) || isComputed(value as () => T);
}

export type Signal<T> = ReturnType<typeof signal<T>>;

/**
 * @param {function(): void} fn
 */
export const batch = (fn) => {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
};

/**
 * @template T
 * @param {function(): T} fn
 * @returns {T}
 */
export const untracked = (fn) => {
  const sub = setActiveSub(void 0);
  try {
    return fn();
  } finally {
    setActiveSub(sub);
  }
};
