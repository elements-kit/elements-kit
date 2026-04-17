import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, signal } from "../index.ts";
import { createResource } from "./resource.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createResource", () => {
  it("starts loading", () => {
    const src = signal("url");
    let r!: ReturnType<typeof createResource<string, string>>;
    effectScope(() => {
      r = createResource(
        () => src(),
        async (_s, _signal) => "data",
      );
    });
    expect(r.loading()).toBe(true);
    expect(r.data()).toBeUndefined();
  });

  it("resolves data and sets loading false", async () => {
    const src = signal("url");
    let r!: ReturnType<typeof createResource<string, string>>;
    effectScope(() => {
      r = createResource(
        () => src(),
        (_s, _signal) => Promise.resolve("hello"),
      );
    });
    await new Promise((res) => setTimeout(res, 0));
    expect(r.data()).toBe("hello");
    expect(r.loading()).toBe(false);
  });

  it("captures errors", async () => {
    const src = signal("url");
    let r!: ReturnType<typeof createResource<string, string>>;
    effectScope(() => {
      r = createResource(
        () => src(),
        (_s, _signal) => Promise.reject(new Error("fail")),
      );
    });
    await new Promise((res) => setTimeout(res, 0));
    expect(r.error()).toBeInstanceOf(Error);
    expect(r.loading()).toBe(false);
  });

  it("refetch re-runs the fetcher", async () => {
    const src = signal("url");
    let callCount = 0;
    let r!: ReturnType<typeof createResource<string, string>>;
    effectScope(() => {
      r = createResource(
        () => src(),
        async () => {
          callCount++;
          return "data";
        },
      );
    });
    await new Promise((res) => setTimeout(res, 0));
    r.refetch();
    await new Promise((res) => setTimeout(res, 0));
    expect(callCount).toBe(2);
  });

  it("retries on failure and eventually resolves", async () => {
    vi.useFakeTimers();
    let calls = 0;
    let r!: ReturnType<typeof createResource<string, string>>;
    effectScope(() => {
      r = createResource(
        () => "url",
        async () => {
          calls++;
          if (calls < 3) throw new Error("fail");
          return "success";
        },
        { maxRetries: 3, retryDelay: 100 },
      );
    });

    await vi.runAllTicks();
    await vi.runAllTimersAsync();
    expect(r.data()).toBe("success");
  }, 10_000);

  it("sets error after exhausting retries", async () => {
    vi.useFakeTimers();
    let r!: ReturnType<typeof createResource<string, string>>;
    effectScope(() => {
      r = createResource(
        () => "url",
        async () => {
          throw new Error("persistent");
        },
        { maxRetries: 2, retryDelay: 50 },
      );
    });
    await vi.runAllTimersAsync();
    expect(r.error()).toBeInstanceOf(Error);
    expect(r.loading()).toBe(false);
  }, 10_000);

  it("exposes attempt count during retries", async () => {
    vi.useFakeTimers();
    let calls = 0;
    let r!: ReturnType<typeof createResource<string, string>>;
    effectScope(() => {
      r = createResource(
        () => "url",
        async () => {
          calls++;
          if (calls < 2) throw new Error("fail");
          return "ok";
        },
        { maxRetries: 3, retryDelay: 100 },
      );
    });

    expect(r.attempt()).toBe(0);
    await vi.runAllTimersAsync();
    expect(r.data()).toBe("ok");
  }, 10_000);
});
