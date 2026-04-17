import { type Computed } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";

type OrientationResult = {
  angle: Computed<number>;
  type: Computed<OrientationType>;
} & Disposable;

/**
 * Returns reactive signals for the screen orientation.
 */
function createOrientation(): OrientationResult {
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
