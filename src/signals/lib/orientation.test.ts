import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createOrientation } from "./orientation.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("createOrientation", () => {
  it("reads initial screen orientation", () => {
    const mockOrientation = {
      angle: 0,
      type: "portrait-primary" as OrientationType,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("screen", { orientation: mockOrientation });

    let o!: ReturnType<typeof createOrientation>;
    effectScope(() => {
      o = createOrientation();
    });
    expect(o.angle()).toBe(0);
    expect(o.type()).toBe("portrait-primary");
  });

  it("removes event listener on Symbol.dispose", () => {
    const removeListener = vi.fn();
    const mockOrientation = {
      angle: 0,
      type: "portrait-primary" as OrientationType,
      addEventListener: vi.fn(),
      removeEventListener: removeListener,
    };
    vi.stubGlobal("screen", { orientation: mockOrientation });

    let o!: ReturnType<typeof createOrientation>;
    effectScope(() => {
      o = createOrientation();
    });
    o[Symbol.dispose]();
    expect(removeListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
