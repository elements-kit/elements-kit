import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createTimestamp } from "./timestamp.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createTimestamp", () => {
  it("returns a number representing Date.now()", () => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 0);
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});

    let ts!: ReturnType<typeof createTimestamp>;
    effectScope(() => {
      ts = createTimestamp();
    });

    expect(typeof ts()).toBe("number");
    expect(ts()).toBeGreaterThan(0);
  });

  it("cancels animation frame on scope disposal", () => {
    const cancelSpy = vi.fn();
    vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(42);
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(cancelSpy);

    const stop = effectScope(() => {
      createTimestamp();
    });

    stop();
    expect(cancelSpy).toHaveBeenCalledWith(42);
  });
});
