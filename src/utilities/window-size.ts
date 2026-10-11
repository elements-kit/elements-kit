import { type Computed, computed } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";
import { isBrowser } from "./environment.ts";

type WindowSizeResult = {
  width: Computed<number>;
  height: Computed<number>;
} & Disposable;

/**
 * Returns reactive `width` and `height` signals tracking the browser window
 * inner dimensions. Outside a browser, returns zeros and a no-op disposer.
 */
function createWindowSize(): WindowSizeResult {
  if (!isBrowser) {
    return {
      width: computed(() => 0),
      height: computed(() => 0),
      [Symbol.dispose]() {},
    } as WindowSizeResult;
  }
  const [size, stop] = sync(fromEvent(window, "resize"), () => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));

  return {
    width: computed(() => size().w),
    height: computed(() => size().h),
    [Symbol.dispose]: stop,
  } as WindowSizeResult;
}

export const windowSize = createWindowSize();
