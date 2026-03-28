export {
  signal,
  isSignal,
  computed,
  isComputed,
  effect,
  isEffect,
  effectScope,
  isEffectScope,
  trigger,
} from "alien-signals";
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

export const batch = (fn: () => void): void => {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
};

export const untracked = <T>(fn: () => T): T => {
  const sub = setActiveSub(void 0);
  try {
    return fn();
  } finally {
    setActiveSub(sub);
  }
};
