import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "@/signals/index.ts";
import { createInterval } from "./interval.ts";
import * as asyncModule from "./async.ts";

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
    expect(iv.pending()).toBe(false);
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

  it("no-callback form updates timestamp on each tick", () => {
    vi.useFakeTimers();
    let iv!: ReturnType<typeof createInterval>;
    effectScope(() => {
      iv = createInterval(100);
    });
    const before = iv.timestamp();
    vi.advanceTimersByTime(100);
    expect(iv.timestamp()).toBeGreaterThan(before);
  });

  it("dynamic delay form is called each tick", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const getDelay = vi.fn().mockReturnValue(100);
    effectScope(() => {
      createInterval(cb, getDelay);
    });
    vi.advanceTimersByTime(300);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it("stops when scope is disposed", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const stop = effectScope(() => {
      createInterval(cb, 100);
    });
    stop();
    vi.advanceTimersByTime(500);
    expect(cb).toHaveBeenCalledTimes(0);
  });

  it("composes with async() — reruns on each tick", async () => {
    vi.useFakeTimers();
    const asyncOp = asyncModule.async;
    let runCount = 0;
    const timer = createInterval(100);

    const op = asyncOp(() => {
      timer.timestamp(); // tracked — reruns on each tick
      runCount++;
      return Promise.resolve(runCount);
    }).start();

    await vi.advanceTimersByTimeAsync(350); // ~3 ticks
    expect(runCount).toBeGreaterThan(1);

    timer[Symbol.dispose]();
    op.stop();
  });
});
