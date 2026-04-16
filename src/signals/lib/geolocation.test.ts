import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createGeolocation } from "./geolocation.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("createGeolocation", () => {
  it("starts with null position and loading true", () => {
    const watchId = 1;
    vi.stubGlobal("navigator", {
      geolocation: {
        watchPosition: vi.fn().mockReturnValue(watchId),
        clearWatch: vi.fn(),
      },
    });

    let g!: ReturnType<typeof createGeolocation>;
    effectScope(() => {
      g = createGeolocation();
    });

    expect(g.position()).toBeNull();
    expect(g.loading()).toBe(true);
  });

  it("calls clearWatch on Symbol.dispose", () => {
    const clearWatch = vi.fn();
    vi.stubGlobal("navigator", {
      geolocation: {
        watchPosition: vi.fn().mockReturnValue(42),
        clearWatch,
      },
    });

    let g!: ReturnType<typeof createGeolocation>;
    effectScope(() => {
      g = createGeolocation();
    });
    g[Symbol.dispose]();
    expect(clearWatch).toHaveBeenCalledWith(42);
  });
});
