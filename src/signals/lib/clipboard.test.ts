import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createClipboard } from "./clipboard.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("createClipboard", () => {
  it("starts as not copied", () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    let cb!: ReturnType<typeof createClipboard>;
    effectScope(() => {
      cb = createClipboard();
    });
    expect(cb.copied()).toBe(false);
    expect(cb.value()).toBeNull();
  });

  it("sets copied and value after copy()", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    let cb!: ReturnType<typeof createClipboard>;
    effectScope(() => {
      cb = createClipboard();
    });

    await cb.copy("hello");
    expect(cb.copied()).toBe(true);
    expect(cb.value()).toBe("hello");
  });

  it("resets copied after resetDelay", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    let cb!: ReturnType<typeof createClipboard>;
    effectScope(() => {
      cb = createClipboard(500);
    });

    await cb.copy("text");
    vi.advanceTimersByTime(600);
    expect(cb.copied()).toBe(false);
  });
});
