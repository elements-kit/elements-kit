import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createMediaDevices } from "./media-devices.ts";

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

  it("removes devicechange listener on Symbol.dispose", () => {
    const removeListener = vi.fn();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
        addEventListener: vi.fn(),
        removeEventListener: removeListener,
      },
    });

    let d!: ReturnType<typeof createMediaDevices>;
    effectScope(() => {
      d = createMediaDevices();
    });
    d[Symbol.dispose]();
    expect(removeListener).toHaveBeenCalledWith(
      "devicechange",
      expect.any(Function),
    );
  });
});
