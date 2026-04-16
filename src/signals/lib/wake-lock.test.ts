import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createWakeLock } from "./wake-lock.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createWakeLock", () => {
  it("reports isSupported=false when API is missing", () => {
    vi.stubGlobal("navigator", {});

    let wl!: ReturnType<typeof createWakeLock>;
    effectScope(() => {
      wl = createWakeLock();
    });

    expect(wl.isSupported).toBe(false);
    expect(wl.isActive()).toBe(false);
  });

  it("becomes active after request()", async () => {
    const releaseFn = vi.fn();
    const sentinel = {
      released: false,
      addEventListener: vi.fn(),
      release: releaseFn,
    };
    vi.stubGlobal("navigator", {
      wakeLock: { request: vi.fn().mockResolvedValue(sentinel) },
    });

    let wl!: ReturnType<typeof createWakeLock>;
    effectScope(() => {
      wl = createWakeLock();
    });

    expect(wl.isSupported).toBe(true);
    await wl.request();
    expect(wl.isActive()).toBe(true);
  });

  it("becomes inactive after release()", async () => {
    const sentinel = {
      released: false,
      addEventListener: vi.fn(),
      release: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal("navigator", {
      wakeLock: { request: vi.fn().mockResolvedValue(sentinel) },
    });

    let wl!: ReturnType<typeof createWakeLock>;
    effectScope(() => {
      wl = createWakeLock();
    });

    await wl.request();
    await wl.release();
    expect(wl.isActive()).toBe(false);
  });
});
