import { type Computed, signal } from "../index.ts";

type NotificationResult = {
  /** Current permission state. */
  permission: Computed<NotificationPermission>;
  /** Whether notifications are supported. */
  isSupported: boolean;
  /** Request notification permission. Resolves with the permission state. */
  requestPermission(): Promise<NotificationPermission>;
  /** Show a notification. Returns the Notification instance, or `null` if not permitted. */
  notify(title: string, options?: NotificationOptions): Notification | null;
};

/**
 * Reactive wrapper around the Web Notifications API.
 */
export function createWebNotification(): NotificationResult {
  const isSupported = typeof Notification !== "undefined";
  const permission = signal<NotificationPermission>(
    isSupported ? Notification.permission : "denied",
  );

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) return "denied";
    const result = await Notification.requestPermission();
    permission(result);
    return result;
  };

  const notify = (
    title: string,
    options?: NotificationOptions,
  ): Notification | null => {
    if (!isSupported || permission() !== "granted") return null;
    return new Notification(title, options);
  };

  return {
    permission: permission as Computed<NotificationPermission>,
    isSupported,
    requestPermission,
    notify,
  };
}
