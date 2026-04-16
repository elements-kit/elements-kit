import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createEyeDropper } from "./eye-dropper.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createEyeDropper", () => {
  it("reports isSupported=false when API is missing", () => {
    // happy-dom won't have EyeDropper
    let ed!: ReturnType<typeof createEyeDropper>;
    effectScope(() => {
      ed = createEyeDropper();
    });

    expect(ed.isSupported).toBe(false);
    expect(ed.color()).toBe("");
  });

  it("returns color after open() when supported", async () => {
    vi.stubGlobal(
      "EyeDropper",
      class {
        open = vi.fn().mockResolvedValue({ sRGBHex: "#ff0000" });
      },
    );

    let ed!: ReturnType<typeof createEyeDropper>;
    effectScope(() => {
      ed = createEyeDropper();
    });

    expect(ed.isSupported).toBe(true);
    const result = await ed.open();
    expect(result).toBe("#ff0000");
    expect(ed.color()).toBe("#ff0000");
  });
});
