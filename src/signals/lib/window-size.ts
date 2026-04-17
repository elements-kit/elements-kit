import { type Computed, computed } from "../index.ts";
import { fromEvent, sync } from "./event-driven.ts";

type WindowSizeResult = {
  width: Computed<number>;
  height: Computed<number>;
} & Disposable;

/**
 * Returns reactive `width` and `height` signals tracking the browser window
 * inner dimensions.
 */
export function createWindowSize(): WindowSizeResult {
  const isBrowser = typeof window !== "undefined";
  const [size, stop] = sync(fromEvent(window, "resize"), () => ({
    w: isBrowser ? window.innerWidth : 0,
    h: isBrowser ? window.innerHeight : 0,
  }));

  return {
    width: computed(() => size().w),
    height: computed(() => size().h),
    [Symbol.dispose]: stop,
  } as WindowSizeResult;
}
