import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

type MotionResult = {
  acceleration: Computed<DeviceMotionEventAcceleration | null>;
  accelerationIncludingGravity: Computed<DeviceMotionEventAcceleration | null>;
  rotationRate: Computed<DeviceMotionEventRotationRate | null>;
  interval: Computed<number | null>;
} & Disposable;

/**
 * Returns reactive signals driven by the `devicemotion` event.
 */
export function createMotion(): MotionResult {
  const acceleration = signal<DeviceMotionEventAcceleration | null>(null);
  const accelerationIncludingGravity =
    signal<DeviceMotionEventAcceleration | null>(null);
  const rotationRate = signal<DeviceMotionEventRotationRate | null>(null);
  const interval = signal<number | null>(null);

  const onMotion = (e: DeviceMotionEvent) => {
    acceleration(e.acceleration);
    accelerationIncludingGravity(e.accelerationIncludingGravity);
    rotationRate(e.rotationRate);
    interval(e.interval);
  };

  const cleanup = createEventListener(window, "devicemotion", onMotion);

  return Object.assign(
    {
      acceleration:
        acceleration as Computed<DeviceMotionEventAcceleration | null>,
      accelerationIncludingGravity:
        accelerationIncludingGravity as Computed<DeviceMotionEventAcceleration | null>,
      rotationRate:
        rotationRate as Computed<DeviceMotionEventRotationRate | null>,
      interval: interval as Computed<number | null>,
    },
    { [Symbol.dispose]: cleanup },
  );
}
