import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createIsIdle } from "./is-idle.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createIsIdle", () => {
  it("starts as false (user is active)", () => {
    vi.useFakeTimers();
    let idle!: ReturnType<typeof createIsIdle>;
    effectScope(() => {
      idle = createIsIdle(1000);
    });
    expect(idle()).toBe(false);
  });

  it("becomes true after the timeout", () => {
    vi.useFakeTimers();
    let idle!: ReturnType<typeof createIsIdle>;
    effectScope(() => {
      idle = createIsIdle(1000);
    });
    vi.advanceTimersByTime(1001);
    expect(idle()).toBe(true);
  });

  it("resets the timer on activity", () => {
    vi.useFakeTimers();
    let idle!: ReturnType<typeof createIsIdle>;
    effectScope(() => {
      idle = createIsIdle(1000);
    });
    vi.advanceTimersByTime(800);
    window.dispatchEvent(new MouseEvent("mousemove"));
    vi.advanceTimersByTime(800);
    expect(idle()).toBe(false);
  });

  it("stops reacting after scope disposal", () => {
    vi.useFakeTimers();
    let idle!: ReturnType<typeof createIsIdle>;
    const stop = effectScope(() => {
      idle = createIsIdle(500);
    });
    stop();
    vi.advanceTimersByTime(1000);
    expect(idle()).toBe(false);
  });
});
