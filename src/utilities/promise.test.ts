import { describe, expect, it } from "vitest";
import { effect } from "@/signals/index.ts";
import { promise, ReactivePromise } from "./promise.ts";

describe("ReactivePromise", () => {
  it("starts in pending state", () => {
    const rp = new ReactivePromise(() => {});
    expect(rp.state).toBe("pending");
    expect(rp.value).toBeUndefined();
    expect(rp.reason).toBeUndefined();
    expect(rp.result).toBeUndefined();
  });

  it("transitions to fulfilled", async () => {
    const rp = new ReactivePromise<number>((resolve) => resolve(42));
    await rp;
    expect(rp.state).toBe("fulfilled");
    expect(rp.value).toBe(42);
    expect(rp.reason).toBeUndefined();
    expect(rp.result).toBe(42);
  });

  it("transitions to rejected", async () => {
    const err = new Error("fail");
    const rp = new ReactivePromise((_, reject) => reject(err));
    await rp.catch(() => {});
    expect(rp.state).toBe("rejected");
    expect(rp.reason).toBe(err);
    expect(rp.value).toBeUndefined();
    expect(rp.result).toBe(err);
  });

  it("unwraps a PromiseLike value", async () => {
    const rp = new ReactivePromise<number>((resolve) =>
      resolve(Promise.resolve(99)),
    );
    await rp;
    expect(rp.value).toBe(99);
  });

  it("state and value update atomically — no inconsistent intermediate state", async () => {
    const rp = new ReactivePromise<number>((resolve) => resolve(7));
    const snapshots: Array<{ state: string; value: number | undefined }> = [];
    const stop = effect(() => {
      snapshots.push({ state: rp.state, value: rp.value });
    });
    await rp;
    stop();
    const inconsistent = snapshots.find(
      (s) => s.state === "fulfilled" && s.value === undefined,
    );
    expect(inconsistent).toBeUndefined();
    expect(snapshots.at(-1)).toEqual({ state: "fulfilled", value: 7 });
  });

  it("state and reason update atomically on rejection", async () => {
    const err = new Error("oops");
    const rp = new ReactivePromise((_, reject) => reject(err));
    const snapshots: Array<{ state: string; reason: unknown }> = [];
    const stop = effect(() => {
      snapshots.push({ state: rp.state, reason: rp.reason });
    });
    await rp.catch(() => {});
    stop();
    const inconsistent = snapshots.find(
      (s) => s.state === "rejected" && s.reason === undefined,
    );
    expect(inconsistent).toBeUndefined();
    expect(snapshots.at(-1)).toEqual({ state: "rejected", reason: err });
  });

  it("ReactivePromise.from() wraps an existing Promise", async () => {
    const rp = ReactivePromise.from(Promise.resolve("hello"));
    await rp;
    expect(rp.state).toBe("fulfilled");
    expect(rp.value).toBe("hello");
  });
});

describe("promise()", () => {
  it("is instanceof ReactivePromise", () => {
    const cp = promise(() => {});
    expect(cp instanceof ReactivePromise).toBe(true);
  });

  it("returns undefined while pending", () => {
    const cp = promise<number>(() => {});
    expect(cp()).toBeUndefined();
    expect(cp.state).toBe("pending");
  });

  it("returns the resolved value when fulfilled", async () => {
    const cp = promise<number>((resolve) => resolve(42));
    await cp;
    expect(cp()).toBe(42);
  });

  it("throws the rejection reason when rejected", async () => {
    const err = new Error("fail");
    const cp = promise<number>((_, reject) => reject(err));
    await cp.catch(() => {});
    expect(() => cp()).toThrow(err);
  });

  it("wraps an existing Promise", async () => {
    const cp = promise(Promise.resolve("hi"));
    await cp;
    expect(cp()).toBe("hi");
  });

  it("passes through a ReactivePromise", async () => {
    const rp = new ReactivePromise<number>((resolve) => resolve(5));
    const cp = promise(rp);
    await cp;
    expect(cp()).toBe(5);
  });

  it("is awaitable — resolves to the fulfilled value", async () => {
    const cp = promise<number>((resolve) => resolve(100));
    expect(await cp).toBe(100);
  });

  it("is awaitable — rejects on failure", async () => {
    const err = new Error("bad");
    const cp = promise<number>((_, reject) => reject(err));
    let caught: unknown;
    await cp.catch((e) => {
      caught = e;
    });
    expect(caught).toBe(err);
  });

  it("delegates .then()", async () => {
    const cp = promise<number>((resolve) => resolve(3));
    expect(await cp.then((v) => v * 2)).toBe(6);
  });

  it("delegates .catch()", async () => {
    const err = new Error("caught");
    const cp = promise<number>((_, reject) => reject(err));
    expect(await cp.catch((e) => e)).toBe(err);
  });

  it("is reactive — effect reruns on fulfillment", async () => {
    const cp = promise<number>((resolve) => resolve(1));
    const values: Array<number | undefined> = [];
    const stop = effect(() => {
      values.push(cp());
    });
    await cp;
    stop();
    expect(values).toEqual([undefined, 1]);
  });

  it("is reactive — cp.reason updates on rejection", async () => {
    const err = new Error("x");
    const cp = promise<number>((_, reject) => reject(err));
    const reasons: unknown[] = [];
    const stop = effect(() => {
      reasons.push(cp.reason);
    });
    await cp.catch(() => {});
    stop();
    expect(reasons).toEqual([undefined, err]);
  });
});
