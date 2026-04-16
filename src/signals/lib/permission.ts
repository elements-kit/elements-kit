import { type Computed, onCleanup, signal } from "../index.ts";

type PermissionResult = {
  state: Computed<PermissionState | "unsupported">;
} & Disposable;

/**
 * Returns a reactive `Computed` reflecting the current permission state for
 * the given descriptor.  Falls back to `"unsupported"` when the Permissions
 * API is unavailable.
 */
export function createPermission(
  descriptor: PermissionDescriptor,
): PermissionResult {
  const state = signal<PermissionState | "unsupported">("unsupported");

  let permissionStatus: PermissionStatus | undefined;

  const cleanup = () => {
    permissionStatus?.removeEventListener("change", onChange);
  };

  const onChange = () => {
    if (permissionStatus) state(permissionStatus.state);
  };

  if (typeof navigator !== "undefined" && navigator.permissions != null) {
    navigator.permissions.query(descriptor).then((status) => {
      permissionStatus = status;
      state(status.state);
      status.addEventListener("change", onChange);
    });
  }

  onCleanup(cleanup);

  return Object.assign(
    { state: state as Computed<PermissionState | "unsupported"> },
    { [Symbol.dispose]: cleanup },
  );
}
