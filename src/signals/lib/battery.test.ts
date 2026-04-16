import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createBattery } from "./battery.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("createBattery", () => {
  it("returns unsupported=false when getBattery not present", () => {
    vi.stubGlobal("navigator", {});
    let b!: ReturnType<typeof createBattery>;
    effectScope(() => {
      b = createBattery();
    });
    expect(b.supported()).toBe(false);
  });

  it("fetches battery info via getBattery", async () => {
    const batteryMock = {
      charging: true,
      level: 0.8,
      chargingTime: 3600,
      dischargingTime: Infinity,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("navigator", {
      getBattery: vi.fn().mockResolvedValue(batteryMock),
    });

    let b!: ReturnType<typeof createBattery>;
    effectScope(() => {
      b = createBattery();
    });

    await new Promise((res) => setTimeout(res, 0));
    expect(b.charging()).toBe(true);
    expect(b.level()).toBe(0.8);
  });
});
