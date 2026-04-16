import { type Computed, onCleanup, signal } from "../index.ts";

type WakeLockResult = {
  /** Whether the wake lock is currently active. */
  isActive: Computed<boolean>;
  /** Whether the Wake Lock API is supported. */
  isSupported: boolean;
  /** Request a screen wake lock. */
  request(): Promise<void>;
  /** Release the current wake lock. */
  release(): Promise<void>;
} & Disposable;

/**
 * Manages a screen wake lock to prevent the device from dimming or locking
 * the screen.
 */
export function createWakeLock(): WakeLockResult {
  const isSupported = "wakeLock" in navigator;
  const isActive = signal(false);
  let sentinel: WakeLockSentinel | null = null;

  const request = async () => {
    if (!isSupported) return;
    sentinel = await navigator.wakeLock.request("screen");
    isActive(true);
    sentinel.addEventListener("release", () => {
      isActive(false);
      sentinel = null;
    });
  };

  const release = async () => {
    await sentinel?.release();
    sentinel = null;
    isActive(false);
  };

  const cleanup = () => {
    sentinel?.release();
  };
  onCleanup(cleanup);

  return {
    isActive: isActive as Computed<boolean>,
    isSupported,
    request,
    release,
    [Symbol.dispose]: cleanup,
  };
}
