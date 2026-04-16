import { type Computed } from "../index.ts";
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
  const subscribe = fromEvent(window, "resize");
  const [width, stopWidth] = sync(subscribe, () =>
    typeof window !== "undefined" ? window.innerWidth : 0,
  );
  const [height, stopHeight] = sync(subscribe, () =>
    typeof window !== "undefined" ? window.innerHeight : 0,
  );

  return {
    width: width as Computed<number>,
    height: height as Computed<number>,
    [Symbol.dispose]: () => {
      stopWidth();
      stopHeight();
    },
  } as WindowSizeResult;
}
