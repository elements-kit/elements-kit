import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { effectScope, signal } from "@/signals/index.ts";
import { createDebounced } from "./debounced.ts";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createDebounced", () => {
  it("returns the initial value synchronously", () => {
    const s = signal(42);
    let d!: ReturnType<typeof createDebounced<number>>;
    effectScope(() => {
      d = createDebounced(() => s(), 100);
    });
    expect(d()).toBe(42);
  });

  it("does not update before the delay elapses", () => {
    const s = signal(0);
    let d!: ReturnType<typeof createDebounced<number>>;
    effectScope(() => {
      d = createDebounced(() => s(), 100);
    });

    s(1);
    vi.advanceTimersByTime(50);
    expect(d()).toBe(0);
  });

  it("updates after the delay elapses", () => {
    const s = signal(0);
    let d!: ReturnType<typeof createDebounced<number>>;
    effectScope(() => {
      d = createDebounced(() => s(), 100);
    });

    s(1);
    vi.advanceTimersByTime(100);
    expect(d()).toBe(1);
  });

  it("resets the timer on each rapid change", () => {
    const s = signal(0);
    let d!: ReturnType<typeof createDebounced<number>>;
    effectScope(() => {
      d = createDebounced(() => s(), 100);
    });

    s(1);
    vi.advanceTimersByTime(50);
    s(2);
    vi.advanceTimersByTime(50);
    expect(d()).toBe(0); // timer reset, not yet settled

    vi.advanceTimersByTime(50);
    expect(d()).toBe(2); // settled on latest
  });

  it("stops updating after scope disposal", () => {
    const s = signal(0);
    let d!: ReturnType<typeof createDebounced<number>>;
    const stop = effectScope(() => {
      d = createDebounced(() => s(), 100);
    });

    stop();
    s(99);
    vi.advanceTimersByTime(200);
    expect(d()).toBe(0);
  });
});
