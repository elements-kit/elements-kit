import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "@/signals/index.ts";
import { createTimeout } from "@/utilities/timeout.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createTimeout", () => {
  it("starts as running", () => {
    vi.useFakeTimers();
    let t!: ReturnType<typeof createTimeout>;
    const cb = vi.fn();
    effectScope(() => {
      t = createTimeout(cb, 500);
    });
    expect(t.pending()).toBe(true);
  });

  it("fires callback after delay", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    effectScope(() => {
      createTimeout(cb, 500);
    });
    vi.advanceTimersByTime(600);
    expect(cb).toHaveBeenCalledOnce();
  });

  it("isRunning becomes false after firing", () => {
    vi.useFakeTimers();
    let t!: ReturnType<typeof createTimeout>;
    effectScope(() => {
      t = createTimeout(vi.fn(), 200);
    });
    vi.advanceTimersByTime(300);
    expect(t.pending()).toBe(false);
  });

  it("stop() cancels the timeout", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    let t!: ReturnType<typeof createTimeout>;
    effectScope(() => {
      t = createTimeout(cb, 500);
    });
    t.stop();
    vi.advanceTimersByTime(1000);
    expect(cb).not.toHaveBeenCalled();
  });

  it("reset() restarts the timer", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    let t!: ReturnType<typeof createTimeout>;
    effectScope(() => {
      t = createTimeout(cb, 500);
    });
    vi.advanceTimersByTime(300);
    t.reset();
    vi.advanceTimersByTime(300);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(cb).toHaveBeenCalledOnce();
  });
});
