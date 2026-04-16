import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { effectScope, signal } from "../index.ts";
import { createThrottled } from "./throttled.ts";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createThrottled", () => {
  it("returns the initial value synchronously", () => {
    const s = signal(7);
    let t!: ReturnType<typeof createThrottled<number>>;
    effectScope(() => {
      t = createThrottled(() => s(), 200);
    });
    expect(t()).toBe(7);
  });

  it("passes through the first change immediately (leading edge)", () => {
    const s = signal(0);
    let t!: ReturnType<typeof createThrottled<number>>;
    effectScope(() => {
      t = createThrottled(() => s(), 200);
    });

    s(1);
    // The initial effect run happens at time 0 with elapsed >= interval (epoch >> 200ms)
    // so the first update fires immediately.
    expect(t()).toBe(1);
  });

  it("schedules a trailing update for rapid changes within the interval", () => {
    const s = signal(0);
    let t!: ReturnType<typeof createThrottled<number>>;
    effectScope(() => {
      t = createThrottled(() => s(), 200);
    });

    s(1); // fires immediately
    expect(t()).toBe(1);

    s(2); // within interval — queued as trailing
    expect(t()).toBe(1); // not yet

    vi.advanceTimersByTime(200);
    expect(t()).toBe(2); // trailing fired
  });

  it("stops updating after scope disposal", () => {
    const s = signal(0);
    let t!: ReturnType<typeof createThrottled<number>>;
    const stop = effectScope(() => {
      t = createThrottled(() => s(), 200);
    });

    s(1);
    stop();
    s(99);
    vi.advanceTimersByTime(400);
    expect(t()).toBe(1);
  });
});
