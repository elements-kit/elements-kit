import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createAsyncRetry } from "./async-retry.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createAsyncRetry", () => {
  it("resolves successfully on first try", async () => {
    const src = () => "url";
    let r!: ReturnType<typeof createAsyncRetry<string, string>>;
    effectScope(() => {
      r = createAsyncRetry(src, async () => "ok");
    });
    await new Promise((res) => setTimeout(res, 0));
    expect(r.data()).toBe("ok");
    expect(r.loading()).toBe(false);
  });

  it("retries on failure and eventually resolves", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const src = () => "url";
    let r!: ReturnType<typeof createAsyncRetry<string, string>>;
    effectScope(() => {
      r = createAsyncRetry(
        src,
        async () => {
          calls++;
          if (calls < 3) throw new Error("fail");
          return "success";
        },
        { maxRetries: 3, delay: 100 },
      );
    });

    // First attempt fails
    await vi.runAllTicks();
    // Advance through retry delays
    await vi.runAllTimersAsync();
    expect(r.data()).toBe("success");
  }, 10_000);

  it("sets error after exhausting retries", async () => {
    vi.useFakeTimers();
    const src = () => "url";
    let r!: ReturnType<typeof createAsyncRetry<string, string>>;
    effectScope(() => {
      r = createAsyncRetry(
        src,
        async () => {
          throw new Error("persistent");
        },
        {
          maxRetries: 2,
          delay: 50,
        },
      );
    });
    await vi.runAllTimersAsync();
    expect(r.error()).toBeInstanceOf(Error);
    expect(r.loading()).toBe(false);
  }, 10_000);
});
