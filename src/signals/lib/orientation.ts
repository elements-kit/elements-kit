import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

type OrientationResult = {
  angle: Computed<number>;
  type: Computed<OrientationType>;
} & Disposable;

/**
 * Returns reactive signals for the screen orientation.
 */
export function createOrientation(): OrientationResult {
  const angle = signal<number>(screen.orientation?.angle ?? 0);
  const type = signal<OrientationType>(
    screen.orientation?.type ?? "portrait-primary",
  );

  const onChange = () => {
    angle(screen.orientation.angle);
    type(screen.orientation.type);
  };

  const cleanup = createEventListener(screen.orientation, "change", onChange);

  return Object.assign(
    {
      angle: angle as Computed<number>,
      type: type as Computed<OrientationType>,
    },
    { [Symbol.dispose]: cleanup },
  );
}
