import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createInterval } from "./interval.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createInterval", () => {
  it("calls callback on each tick", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    effectScope(() => {
      createInterval(cb, 100);
    });
    vi.advanceTimersByTime(350);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it("stop() pauses the interval", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    let iv!: ReturnType<typeof createInterval>;
    effectScope(() => {
      iv = createInterval(cb, 100);
    });
    iv.stop();
    vi.advanceTimersByTime(500);
    expect(cb).toHaveBeenCalledTimes(0);
    expect(iv.isRunning()).toBe(false);
  });

  it("start() resumes after stop", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    let iv!: ReturnType<typeof createInterval>;
    effectScope(() => {
      iv = createInterval(cb, 100);
    });
    iv.stop();
    iv.start();
    vi.advanceTimersByTime(250);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("reset() restarts the interval", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    let iv!: ReturnType<typeof createInterval>;
    effectScope(() => {
      iv = createInterval(cb, 100);
    });
    vi.advanceTimersByTime(50);
    iv.reset();
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("Symbol.dispose cleans up", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    let iv!: ReturnType<typeof createInterval>;
    effectScope(() => {
      iv = createInterval(cb, 100);
    });
    iv[Symbol.dispose]();
    vi.advanceTimersByTime(500);
    expect(cb).toHaveBeenCalledTimes(0);
  });
});
