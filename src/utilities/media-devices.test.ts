import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "@/signals/index.ts";
import { createMediaDevices } from "@/utilities/media-devices.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("createMediaDevices", () => {
  it("returns a list of devices", async () => {
    const mockDevices = [
      { deviceId: "1", kind: "audioinput", label: "Mic" },
    ] as MediaDeviceInfo[];
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices: vi.fn().mockResolvedValue(mockDevices),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    let d!: ReturnType<typeof createMediaDevices>;
    effectScope(() => {
      d = createMediaDevices();
    });

    await new Promise((res) => setTimeout(res, 0));
    expect(d()).toEqual(mockDevices);
  });

  it("removes devicechange listener on scope disposal", () => {
    const removeListener = vi.fn();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
        addEventListener: vi.fn(),
        removeEventListener: removeListener,
      },
    });

    let d!: ReturnType<typeof createMediaDevices>;
    const stop = effectScope(() => {
      d = createMediaDevices();
    });
    stop();
    expect(removeListener).toHaveBeenCalledWith(
      "devicechange",
      expect.any(Function),
    );
  });
});
