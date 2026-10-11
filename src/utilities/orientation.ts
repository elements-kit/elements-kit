import { type Computed, computed } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";
import { isBrowser } from "./environment.ts";

type OrientationResult = {
  angle: Computed<number>;
  type: Computed<OrientationType>;
} & Disposable;

/**
 * Returns reactive signals for the screen orientation. Outside a browser,
 * returns `{ angle: 0, type: "portrait-primary" }` and a no-op disposer.
 */
function createOrientation(): OrientationResult {
  if (!isBrowser) {
    return {
      angle: computed(() => 0),
      type: computed<OrientationType>(() => "portrait-primary"),
      [Symbol.dispose]() {},
    } as OrientationResult;
  }
  const subscribe = fromEvent(screen.orientation, "change");
  const [angle, stopAngle] = sync(
    subscribe,
    () => screen.orientation?.angle ?? 0,
  );
  const [type, stopType] = sync(
    subscribe,
    () => screen.orientation?.type ?? "portrait-primary",
  );

  return {
    angle: angle as Computed<number>,
    type: type as Computed<OrientationType>,
    [Symbol.dispose]: () => {
      stopAngle();
      stopType();
    },
  } as OrientationResult;
}

export const orientation = createOrientation();
