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

  it("pending becomes false after firing", () => {
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

  it("immediate=false does not start automatically", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    let t!: ReturnType<typeof createTimeout>;
    effectScope(() => {
      t = createTimeout(cb, 200, false);
    });
    expect(t.pending()).toBe(false);
    vi.advanceTimersByTime(300);
    expect(cb).not.toHaveBeenCalled();
  });

  it("start() fires after delay when called manually", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    let t!: ReturnType<typeof createTimeout>;
    effectScope(() => {
      t = createTimeout(cb, 200, false);
    });
    t.start();
    expect(t.pending()).toBe(true);
    vi.advanceTimersByTime(200);
    expect(cb).toHaveBeenCalledOnce();
    expect(t.pending()).toBe(false);
  });

  it("Symbol.dispose cancels the timeout", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    let t!: ReturnType<typeof createTimeout>;
    effectScope(() => {
      t = createTimeout(cb, 500);
    });
    t[Symbol.dispose]();
    vi.advanceTimersByTime(1000);
    expect(cb).not.toHaveBeenCalled();
  });

  it("stops when scope is disposed", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const stop = effectScope(() => {
      createTimeout(cb, 200);
    });
    stop();
    vi.advanceTimersByTime(500);
    expect(cb).not.toHaveBeenCalled();
  });

  it("dynamic delay function is called at start", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const getDelay = vi.fn().mockReturnValue(300);
    effectScope(() => {
      createTimeout(cb, getDelay);
    });
    vi.advanceTimersByTime(300);
    expect(cb).toHaveBeenCalledOnce();
    expect(getDelay).toHaveBeenCalledOnce();
  });
});
