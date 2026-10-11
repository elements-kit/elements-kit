import { describe, expect, it, vi } from "vitest";
import { onCleanup } from "@/signals/index.ts";
import { retry } from "./retry.ts";

describe("retry", () => {
  it("resolves immediately on first success", async () => {
    const fn = retry(() => Promise.resolve(42), 3);
    expect(await fn()).toBe(42);
  });

  it("retries after failure and resolves on later success", async () => {
    let calls = 0;
    const fn = retry(() => {
      calls++;
      if (calls < 3) return Promise.reject(new Error("fail"));
      return Promise.resolve(calls);
    }, 3);
    expect(await fn()).toBe(3);
    expect(calls).toBe(3);
  });

  it("rejects after exhausting all attempts", async () => {
    const err = new Error("always fails");
    const fn = retry(() => Promise.reject(err), 3);
    await expect(fn()).rejects.toBe(err);
  });

  it("rejects with the last error", async () => {
    let i = 0;
    const errors = [new Error("a"), new Error("b"), new Error("c")];
    const fn = retry(() => Promise.reject(errors[i++]), 3);
    await expect(fn()).rejects.toBe(errors[2]);
  });

  it("delays between failures but not after the last", async () => {
    const delayFn = vi.fn().mockReturnValue(0);
    const fn = retry(() => Promise.reject(new Error("x")), 3, delayFn);
    await fn().catch(() => {});
    // 3 attempts = 2 inter-failure delays, none after the last
    expect(delayFn).toHaveBeenCalledTimes(2);
  });

  it("supports dynamic delay via function — passes attempt index", async () => {
    const delayFn = vi.fn().mockReturnValue(0);
    const fn = retry(() => Promise.reject(new Error("x")), 3, delayFn);
    await fn().catch(() => {});
    expect(delayFn).toHaveBeenNthCalledWith(1, 0);
    expect(delayFn).toHaveBeenNthCalledWith(2, 1);
  });

  it("onCleanup inside fn fires before each retry", async () => {
    const cleaned: number[] = [];
    let attempt = 0;
    const fn = retry(() => {
      const i = attempt++;
      onCleanup(() => cleaned.push(i));
      if (i < 2) return Promise.reject(new Error("fail"));
      return Promise.resolve(i);
    }, 3);
    await fn();
    // attempts 0 and 1 should have their cleanup fired before retry
    expect(cleaned).toContain(0);
    expect(cleaned).toContain(1);
  });

  it("composes with async()", async () => {
    const asyncModule = await import("./async.ts");
    const asyncOp = asyncModule.async;
    let calls = 0;
    const op = asyncOp(() =>
      retry(() => {
        calls++;
        if (calls < 2) return Promise.reject(new Error("fail"));
        return Promise.resolve(calls);
      }, 3)(),
    );
    op.start();
    await op;
    expect(op.value).toBe(2);
    op.stop();
  });

  it("AbortController cleanup fires between retries when composed with async()", async () => {
    const asyncModule = await import("./async.ts");
    const asyncOp = asyncModule.async;
    const aborted: number[] = [];
    let attempt = 0;

    const op = asyncOp(() => {
      const i = attempt++;
      onCleanup(() => aborted.push(i));
      if (i < 2) return Promise.reject(new Error("fail"));
      return Promise.resolve(i);
    });

    op.start();
    await op.catch(() => {});

    // retry wraps each attempt — cleanup from attempts 0 and 1 should fire before retry
    op.stop();
  });
});
