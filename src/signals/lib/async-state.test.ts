import { describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createAsyncState } from "./async-state.ts";

describe("createAsyncState", () => {
  it("resolves a promise and sets data", async () => {
    let r!: ReturnType<typeof createAsyncState<string>>;
    effectScope(() => {
      r = createAsyncState(() => Promise.resolve("hello"));
    });
    expect(r.loading()).toBe(true);
    await vi.waitFor(() => expect(r.data()).toBe("hello"));
    expect(r.loading()).toBe(false);
  });

  it("captures errors", async () => {
    let r!: ReturnType<typeof createAsyncState<string>>;
    effectScope(() => {
      r = createAsyncState(() => Promise.reject(new Error("fail")));
    });
    await vi.waitFor(() => expect(r.error()).toBeInstanceOf(Error));
    expect(r.loading()).toBe(false);
  });

  it("supports immediate: false", () => {
    let called = false;
    let r!: ReturnType<typeof createAsyncState<string>>;
    effectScope(() => {
      r = createAsyncState(
        () => {
          called = true;
          return Promise.resolve("x");
        },
        { immediate: false },
      );
    });
    expect(called).toBe(false);
    expect(r.loading()).toBe(false);
  });

  it("execute() triggers re-run", async () => {
    let count = 0;
    let r!: ReturnType<typeof createAsyncState<number>>;
    effectScope(() => {
      r = createAsyncState(() => Promise.resolve(++count));
    });
    await vi.waitFor(() => expect(r.data()).toBe(1));
    r.execute();
    await vi.waitFor(() => expect(r.data()).toBe(2));
  });

  it("streams values from an async iterable", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
    }

    let r!: ReturnType<typeof createAsyncState<number>>;
    effectScope(() => {
      r = createAsyncState(() => gen());
    });
    await vi.waitFor(() => expect(r.data()).toBe(3));
    expect(r.loading()).toBe(false);
  });

  it("uses initialValue", () => {
    let r!: ReturnType<typeof createAsyncState<string>>;
    effectScope(() => {
      r = createAsyncState(() => Promise.resolve("new"), {
        initialValue: "seed",
        immediate: false,
      });
    });
    expect(r.data()).toBe("seed");
  });
});
