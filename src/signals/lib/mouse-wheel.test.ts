import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createMouseWheel } from "./mouse-wheel.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createMouseWheel", () => {
  it("starts at 0", () => {
    let w!: ReturnType<typeof createMouseWheel>;
    effectScope(() => {
      w = createMouseWheel();
    });
    expect(w()).toBe(0);
  });

  it("accumulates deltaY on wheel events", () => {
    let w!: ReturnType<typeof createMouseWheel>;
    effectScope(() => {
      w = createMouseWheel();
    });
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }));
    expect(w()).toBe(100);
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: -50 }));
    expect(w()).toBe(50);
  });

  it("stops updating after Symbol.dispose", () => {
    let w!: ReturnType<typeof createMouseWheel>;
    effectScope(() => {
      w = createMouseWheel();
    });
    w[Symbol.dispose]();
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 200 }));
    expect(w()).toBe(0);
  });
});
