import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

/**
 * Returns a reactive list of available media devices, refreshed whenever
 * devices are added or removed.
 */
export function createMediaDevices(): Computed<MediaDeviceInfo[]> {
  const devices = signal<MediaDeviceInfo[]>([]);

  const refresh = () => {
    navigator.mediaDevices.enumerateDevices().then((list) => devices(list));
  };

  refresh();

  createEventListener(navigator.mediaDevices, "devicechange", refresh);

  return devices as Computed<MediaDeviceInfo[]>;
}
