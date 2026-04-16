import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Returns a reactive list of available media devices, refreshed whenever
 * devices are added or removed.
 */
export function createMediaDevices(): Computed<MediaDeviceInfo[]> & Disposable {
  const devices = signal<MediaDeviceInfo[]>([]);

  const refresh = () => {
    navigator.mediaDevices.enumerateDevices().then((list) => devices(list));
  };

  refresh();

  const cleanup = createEventListener(
    navigator.mediaDevices,
    "devicechange",
    refresh,
  );

  return Object.assign(devices as Computed<MediaDeviceInfo[]>, {
    [Symbol.dispose]: cleanup,
  });
}
