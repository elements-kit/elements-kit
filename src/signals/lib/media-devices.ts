import { type Computed, onCleanup, signal } from "../index.ts";

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

  navigator.mediaDevices.addEventListener("devicechange", refresh);
  const cleanup = () =>
    navigator.mediaDevices.removeEventListener("devicechange", refresh);
  onCleanup(cleanup);

  return Object.assign(devices as Computed<MediaDeviceInfo[]>, {
    [Symbol.dispose]: cleanup,
  });
}
