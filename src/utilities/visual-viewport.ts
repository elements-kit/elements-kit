import { type Computed, computed } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";
import { isBrowser } from "./environment.ts";

type VisualViewportResult = {
  width: Computed<number>;
  height: Computed<number>;
  offsetLeft: Computed<number>;
  offsetTop: Computed<number>;
} & Disposable;

/**
 * The visual viewport — what is left of the window once the software keyboard
 * or pinch-zoom takes its cut, and where that sits in the layout viewport.
 *
 * All three events matter. `resize` is the keyboard and the zoom level;
 * `scroll` is the viewport sliding inside the layout one, which happens
 * without a resize; `scrollend` is the value to trust, because momentum and
 * elastic overscroll walk the offsets around before they settle.
 *
 * Where the API is missing, the window's own size stands in with zero offsets.
 * Outside a browser, zeros and a no-op disposer.
 */
function createVisualViewport(): VisualViewportResult {
  if (!isBrowser) {
    return {
      width: computed(() => 0),
      height: computed(() => 0),
      offsetLeft: computed(() => 0),
      offsetTop: computed(() => 0),
      [Symbol.dispose]() {},
    } as VisualViewportResult;
  }

  const vv = window.visualViewport;
  const [box, stop] = sync(
    vv
      ? fromEvent(vv, ["resize", "scroll", "scrollend"])
      : fromEvent(window, "resize"),
    () => ({
      width: vv?.width ?? window.innerWidth,
      height: vv?.height ?? window.innerHeight,
      offsetLeft: vv?.offsetLeft ?? 0,
      offsetTop: vv?.offsetTop ?? 0,
    }),
  );

  return {
    width: computed(() => box().width),
    height: computed(() => box().height),
    offsetLeft: computed(() => box().offsetLeft),
    offsetTop: computed(() => box().offsetTop),
    [Symbol.dispose]: stop,
  } as VisualViewportResult;
}

export const visualViewport = createVisualViewport();
