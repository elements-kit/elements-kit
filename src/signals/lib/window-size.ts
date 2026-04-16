import { type Computed, onCleanup, signal } from "../index.ts";

type WindowSizeResult = {
  width: Computed<number>;
  height: Computed<number>;
} & Disposable;

/**
 * Returns reactive `width` and `height` signals tracking the browser window
 * inner dimensions.
 */
export function createWindowSize(): WindowSizeResult {
  const width = signal(typeof window !== "undefined" ? window.innerWidth : 0);
  const height = signal(typeof window !== "undefined" ? window.innerHeight : 0);

  const onResize = () => {
    width(window.innerWidth);
    height(window.innerHeight);
  };

  window.addEventListener("resize", onResize);
  const cleanup = () => window.removeEventListener("resize", onResize);
  onCleanup(cleanup);

  return Object.assign(
    { width: width as Computed<number>, height: height as Computed<number> },
    { [Symbol.dispose]: cleanup },
  );
}
