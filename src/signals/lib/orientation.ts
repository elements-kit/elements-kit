import { type Computed, onCleanup, signal } from "../index.ts";

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

  screen.orientation.addEventListener("change", onChange);
  const cleanup = () =>
    screen.orientation.removeEventListener("change", onChange);
  onCleanup(cleanup);

  return Object.assign(
    {
      angle: angle as Computed<number>,
      type: type as Computed<OrientationType>,
    },
    { [Symbol.dispose]: cleanup },
  );
}
