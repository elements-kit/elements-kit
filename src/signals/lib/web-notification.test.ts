import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createWebNotification } from "./web-notification.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createWebNotification", () => {
  it("reports isSupported=false when Notification is missing", () => {
    vi.stubGlobal("Notification", undefined);

    let n!: ReturnType<typeof createWebNotification>;
    effectScope(() => {
      n = createWebNotification();
    });

    expect(n.isSupported).toBe(false);
    expect(n.permission()).toBe("denied");
  });

  it("reads current permission", () => {
    vi.stubGlobal("Notification", {
      permission: "granted",
      requestPermission: vi.fn(),
    });

    let n!: ReturnType<typeof createWebNotification>;
    effectScope(() => {
      n = createWebNotification();
    });

    expect(n.isSupported).toBe(true);
    expect(n.permission()).toBe("granted");
  });

  it("returns null from notify when not granted", () => {
    vi.stubGlobal("Notification", {
      permission: "denied",
      requestPermission: vi.fn(),
    });

    let n!: ReturnType<typeof createWebNotification>;
    effectScope(() => {
      n = createWebNotification();
    });

    expect(n.notify("test")).toBeNull();
  });
});
