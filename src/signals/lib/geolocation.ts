import { type Computed, onCleanup, signal } from "../index.ts";

type GeolocationResult = {
  position: Computed<GeolocationPosition | null>;
  error: Computed<GeolocationPositionError | null>;
  loading: Computed<boolean>;
} & Disposable;

/**
 * Exposes the Geolocation API as reactive signals.
 * Begins watching the position immediately.
 */
export function createGeolocation(
  options?: PositionOptions,
): GeolocationResult {
  const position = signal<GeolocationPosition | null>(null);
  const error = signal<GeolocationPositionError | null>(null);
  const loading = signal(true);

  const onSuccess = (pos: GeolocationPosition) => {
    position(pos);
    error(null);
    loading(false);
  };

  const onError = (err: GeolocationPositionError) => {
    error(err);
    loading(false);
  };

  const watchId = navigator.geolocation.watchPosition(
    onSuccess,
    onError,
    options,
  );

  const cleanup = () => navigator.geolocation.clearWatch(watchId);
  onCleanup(cleanup);

  return Object.assign(
    {
      position: position as Computed<GeolocationPosition | null>,
      error: error as Computed<GeolocationPositionError | null>,
      loading: loading as Computed<boolean>,
    },
    { [Symbol.dispose]: cleanup },
  );
}
