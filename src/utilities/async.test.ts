import { describe, expect, it, vi } from "vitest";
import { batch, effect, onCleanup, signal, untracked } from "@/signals/index.ts";
import { Async, async as asyncOp } from "./async.ts";
import { createInterval } from "./interval.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Async", () => {
  it("is reactive as a computed signal (effect)", async () => {
    const op = asyncOp((x: number) => Promise.resolve(x * 2));
    const values: (number | undefined)[] = [];
    const stop = effect(() => {
      values.push(op());
    });
    op.run(2);
    await op;
    op.run(3);
    await op;
    stop();
    // The first value is undefined (pending), then 4, then 6
    expect(values).toContain(undefined);
    expect(values).toContain(4);
    expect(values).toContain(6);
    expect(values.at(-1)).toBe(6);
  });
  it("is callable as a signal and returns the current result", async () => {
    const op = asyncOp(() => Promise.resolve(123));
    // Initially idle — no result yet
    expect(op()).toBeUndefined();
    op.start();
    await op;
    expect(op()).toBe(123);
    // Rejected
    const err = new Error("fail");
    const op2 = asyncOp(() => Promise.reject(err));
    op2.start();
    await op2.catch(() => {});
    expect(op2()).toBe(err);
  });
  it("starts in idle state with no value or reason", () => {
    const op = asyncOp(() => Promise.resolve(1));
    // A lazy runner has no request before the first run() / start(): idle, not
    // pending. (A bare ReactivePromise, which wraps a real in-flight promise,
    // does start pending — see promise.test.ts.)
    expect(op.state).toBe("idle");
    expect(op.pending).toBe(false);
    expect(op.value).toBeUndefined();
    expect(op.reason).toBeUndefined();
    expect(op.result).toBeUndefined();
    // pending is a convenience getter
    expect(op.pending).toBe(op.state === "pending");
  });

  it("transitions idle -> pending -> fulfilled across a run", async () => {
    const op = asyncOp(() => Promise.resolve(7));
    expect(op.state).toBe("idle");
    op.run();
    expect(op.state).toBe("pending");
    expect(op.pending).toBe(true);
    await op;
    expect(op.state).toBe("fulfilled");
    expect(op.pending).toBe(false);
    expect(op.value).toBe(7);
  });

  it("transitions to fulfilled after start()", async () => {
    const op = asyncOp(() => Promise.resolve(42));
    op.start();
    await op;
    expect(op.state).toBe("fulfilled");
    expect(op.pending).toBe(false);
    expect(op.value).toBe(42);
    expect(op.reason).toBeUndefined();
    expect(op.result).toBe(42);
    // .result is the fulfilled value
    expect(op.result).toBe(42);
  });

  it("transitions to rejected after start()", async () => {
    const err = new Error("fail");
    const op = asyncOp(() => Promise.reject(err));
    op.start();
    await op.catch(() => {});
    expect(op.state).toBe("rejected");
    expect(op.pending).toBe(false);
    expect(op.reason).toBe(err);
    expect(op.value).toBeUndefined();
    expect(op.result).toBe(err);
    // .reason is the rejection reason
    expect(op.reason).toBe(err);
  });
  it("await op.run(args) resolves to the fulfilled value", async () => {
    const op = asyncOp((x: number) => Promise.resolve(x + 100));
    const result = await op.run(23);
    expect(result).toBe(123);
    expect(op.value).toBe(123);
    expect(op.state).toBe("fulfilled");
  });

  it("run() resolves to the fulfilled value", async () => {
    const op = asyncOp((x: number) => Promise.resolve(x * 2));
    expect(await op.run(5)).toBe(10);
  });

  it("await op resolves to the fulfilled value", async () => {
    const op = asyncOp(() => Promise.resolve(7));
    op.start();
    expect(await op).toBe(7);
  });

  it("await op.catch() resolves on rejection", async () => {
    const err = new Error("fail");
    const op = asyncOp(() => Promise.reject(err));
    op.start();
    expect(await op.catch((e) => e)).toBe(err);
  });

  it("delegates .then()", async () => {
    const op = asyncOp(() => Promise.resolve(3));
    op.start();
    expect(await op.then((v) => (v ?? 0) * 2)).toBe(6);
  });

  it("instanceof Async", () => {
    const op = asyncOp(() => Promise.resolve());
    expect(op instanceof Async).toBe(true);
  });

  it("is reactive — effect reruns when state transitions to fulfilled", async () => {
    const op = asyncOp(() => Promise.resolve(10));
    const snapshots: Array<string> = [];
    const stop = effect(() => {
      snapshots.push(op.state);
    });
    op.start();
    await op;
    stop();
    expect(snapshots).toContain("pending");
    expect(snapshots.at(-1)).toBe("fulfilled");
  });

  it("is reactive — effect sees value after fulfillment", async () => {
    const op = asyncOp(() => Promise.resolve(99));
    const values: Array<number | undefined> = [];
    const stop = effect(() => {
      values.push(op.value as number | undefined);
    });
    op.start();
    await op;
    stop();
    expect(values).toEqual([undefined, undefined, 99]);
  });

  it("is reactive — effect reruns on rejection", async () => {
    const err = new Error("x");
    const op = asyncOp(() => Promise.reject(err));
    const reasons: unknown[] = [];
    const stop = effect(() => {
      reasons.push(op.reason);
    });
    op.start();
    await op.catch(() => {});
    stop();
    expect(reasons).toEqual([undefined, undefined, err]);
  });

  it("start() re-runs when a signal read inside fn changes", async () => {
    const id = signal(1);
    const calls: number[] = [];
    const op = asyncOp(() => {
      const current = id();
      calls.push(current);
      return Promise.resolve(current);
    });
    op.start();
    await op;
    id(2);
    await op;
    op.stop();
    expect(calls).toEqual([1, 2]);
  });

  it("run() is not reactive — signal change does not re-run", async () => {
    const id = signal(1);
    const calls: number[] = [];
    const op = asyncOp(() => {
      const current = id();
      calls.push(current);
      return Promise.resolve(current);
    });
    op.run();
    await op;
    id(2);
    await Promise.resolve(); // allow any microtasks to flush
    op.stop();
    expect(calls).toEqual([1]);
  });

  it("start() resets to pending on re-run", async () => {
    const d = deferred<number>();
    const id = signal(1);
    const op = asyncOp(() => {
      id(); // track id
      return d.promise;
    });
    op.start();
    expect(op.pending).toBe(true);
    id(2); // triggers re-run — new pending promise
    expect(op.pending).toBe(true);
    d.resolve(5);
    op.stop();
  });

  it("stop() prevents further reactive reruns", async () => {
    const id = signal(1);
    const calls: number[] = [];
    const op = asyncOp(() => {
      calls.push(id());
      return Promise.resolve(id());
    });
    op.start();
    await op;
    op.stop();
    id(2); // should not trigger re-run
    await Promise.resolve();
    expect(calls).toEqual([1]);
  });

  it("reset() returns to the idle state", async () => {
    const op = asyncOp((x: number) => Promise.resolve(x * 2));
    op.run(2);
    await op;
    expect(op.state).toBe("fulfilled");
    expect(op.result).toBe(4);
    op.reset();
    expect(op.state).toBe("idle");
    expect(op.pending).toBe(false);
    expect(op.value).toBeUndefined();
    expect(op.reason).toBeUndefined();
    expect(op.result).toBeUndefined();
  });

  it("reset() stops reactive reruns and allows a fresh run", async () => {
    const id = signal(1);
    const calls: number[] = [];
    const op = asyncOp(() => {
      calls.push(id());
      return Promise.resolve(id());
    });
    op.start();
    await op;
    op.reset();
    id(2); // no rerun — the tracking effect is gone
    await Promise.resolve();
    expect(calls).toEqual([1]);
    op.run();
    await op;
    expect(op.state).toBe("fulfilled");
    expect(calls).toEqual([1, 2]);
    op.stop();
  });

  it("reset() is reactive — dependents see the cleared result", async () => {
    const op = asyncOp((x: number) => Promise.resolve(x * 2));
    const values: (number | undefined)[] = [];
    const stop = effect(() => {
      values.push(op());
    });
    op.run(2);
    await op;
    op.reset();
    stop();
    expect(values.at(-1)).toBeUndefined();
  });

  it("reset() clears a rejected run", async () => {
    const err = new Error("fail");
    const op = asyncOp(() => Promise.reject(err));
    op.run();
    await op.catch(() => {});
    expect(op.state).toBe("rejected");
    op.reset();
    expect(op.state).toBe("idle");
    expect(op.reason).toBeUndefined();
    expect(op.result).toBeUndefined();
  });

  it("reset() while pending — the in-flight run cannot resurrect state", async () => {
    const d = deferred<number>();
    const op = asyncOp(() => d.promise);
    op.run();
    expect(op.pending).toBe(true);
    op.reset();
    expect(op.state).toBe("idle");
    d.resolve(7); // late settle of the abandoned operation
    await Promise.resolve();
    await Promise.resolve();
    expect(op.state).toBe("idle");
    expect(op.value).toBeUndefined();
  });

  it("onCleanup inside run() fires when reset() is called", () => {
    const cleaned: number[] = [];
    const op = asyncOp(() => {
      onCleanup(() => cleaned.push(1));
      return Promise.resolve();
    });
    op.run();
    expect(cleaned).toEqual([]);
    op.reset();
    expect(cleaned).toEqual([1]);
  });

  it("start() after reset() tracks again", async () => {
    const id = signal(1);
    const calls: number[] = [];
    const op = asyncOp(() => {
      calls.push(id());
      return Promise.resolve(id());
    });
    op.start();
    await op;
    op.reset();
    op.start();
    await op;
    id(2);
    await op;
    op.stop();
    expect(calls).toEqual([1, 1, 2]);
  });

  it("reset() on the class form clears state", async () => {
    const op = new Async((x: number) => Promise.resolve(x * 2));
    op.run(2);
    await op;
    expect(op.state).toBe("fulfilled");
    op.reset();
    expect(op.state).toBe("idle");
    expect(op.result).toBeUndefined();
  });

  it("onCleanup inside run() fires when stop() is called", () => {
    const cleaned: number[] = [];
    const op = asyncOp(() => {
      onCleanup(() => cleaned.push(1));
      return Promise.resolve();
    });
    op.run();
    expect(cleaned).toEqual([]);
    op.stop();
    expect(cleaned).toEqual([1]);
  });

  it("onCleanup inside start() fires on each re-run", async () => {
    const id = signal(1);
    const cleaned: number[] = [];
    const op = asyncOp(() => {
      const current = id(); // track and capture
      onCleanup(() => cleaned.push(current));
      return Promise.resolve();
    });
    op.start();
    await op;
    id(2); // triggers re-run → previous cleanup fires with captured value 1
    await op;
    op.stop();
    expect(cleaned[0]).toBe(1);
  });

  it("re-runs when createInterval ticks", async () => {
    vi.useFakeTimers();
    const timer = createInterval(1_000);
    const calls: number[] = [];
    const op = asyncOp(() => {
      timer.timestamp(); // track timestamp signal
      calls.push(calls.length);
      return Promise.resolve(calls.length);
    });
    op.start();
    await op;
    expect(calls.length).toBe(1);
    vi.advanceTimersByTime(1_000);
    await op;
    expect(calls.length).toBe(2);
    op.stop();
    timer.stop();
    vi.useRealTimers();
  });

  it("state and value update atomically — no inconsistent intermediate state", async () => {
    const op = asyncOp(() => Promise.resolve(7));
    const snapshots: Array<{ state: string; value: number | undefined }> = [];
    const stop = effect(() => {
      snapshots.push({ state: op.state, value: op.value as number | undefined });
    });
    op.start();
    await op;
    stop();
    const inconsistent = snapshots.find(
      (s) => s.state === "fulfilled" && s.value === undefined,
    );
    expect(inconsistent).toBeUndefined();
    expect(snapshots.at(-1)).toEqual({ state: "fulfilled", value: 7 });
  });
});

// Collects unhandled rejections over one macrotask, with Vitest's own
// listeners detached so an expected one doesn't fail the run.
async function unhandledRejections(act: () => void): Promise<unknown[]> {
  const reasons: unknown[] = [];
  const saved = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  const listener = (reason: unknown) => reasons.push(reason);
  process.on("unhandledRejection", listener);
  try {
    act();
    await new Promise((r) => setTimeout(r, 0));
  } finally {
    process.off("unhandledRejection", listener);
    for (const l of saved) process.on("unhandledRejection", l);
  }
  return reasons;
}

describe("Async dropped runs", () => {
  it("reset() — the dropped run's rejection is not unhandled", async () => {
    const d = deferred<number>();
    const op = asyncOp(() => d.promise);
    const reasons = await unhandledRejections(() => {
      op.run();
      op.reset();
      d.reject(new Error("aborted"));
    });
    expect(reasons).toEqual([]);
  });

  it("run() — the replaced run's rejection is not unhandled", async () => {
    const first = deferred<number>();
    const second = deferred<number>();
    const runs = [first, second];
    const op = asyncOp(() => runs.shift()!.promise);
    const reasons = await unhandledRejections(() => {
      op.run();
      op.run();
      first.reject(new Error("aborted"));
    });
    expect(reasons).toEqual([]);
    expect(op.pending).toBe(true);
  });

  it("start() — a reactive re-run's replaced run is not unhandled", async () => {
    const id = signal(1);
    const runs = new Map<number, ReturnType<typeof deferred<number>>>();
    const op = asyncOp(() => {
      const d = deferred<number>();
      runs.set(id(), d);
      return d.promise;
    });
    const reasons = await unhandledRejections(() => {
      op.start();
      id(2);
      runs.get(1)!.reject(new Error("aborted"));
    });
    op.stop();
    expect(reasons).toEqual([]);
  });

  it("the current run's rejection is still unhandled", async () => {
    const err = new Error("real failure");
    const op = asyncOp(() => Promise.reject(err));
    const reasons = await unhandledRejections(() => {
      op.run();
    });
    expect(reasons).toEqual([err]);
  });

  it("existing listeners on a dropped run still receive its rejection", async () => {
    const d = deferred<number>();
    const err = new Error("aborted");
    const op = asyncOp(() => d.promise);
    op.run();
    const caught = op.catch((e) => e);
    op.reset();
    d.reject(err);
    expect(await caught).toBe(err);
  });
});

// An effect that starts the op whenever it's idle writes its own dep during
// its run. `reset()` notifies readers of state, so the effect re-runs.
describe("Async: restart-when-idle effect + reset()", () => {
  const tick = () => new Promise((r) => setTimeout(r, 0));

  function keepAlive<T>(q: Async<undefined, T>, how: "start" | "run" = "start") {
    const log = { starts: 0, states: [] as string[] };
    const stop = effect(() => {
      const state = q.state;
      log.states.push(state);
      if (state !== "idle") return;
      untracked(() => {
        log.starts++;
        if (how === "start") q.start();
        else q.run();
      });
    });
    return { log, stop };
  }

  it("restarts after reset()", async () => {
    const q = asyncOp(async () => undefined);
    const { log, stop } = keepAlive(q);
    expect(log.starts).toBe(1);
    q.reset();
    await tick();
    expect(log.starts).toBe(2);
    stop();
    q.stop();
  });

  it("restarts after reset() repeatedly (5 cycles, after settle)", async () => {
    let calls = 0;
    const q = asyncOp(async () => ++calls);
    const { log, stop } = keepAlive(q);
    for (let i = 1; i <= 5; i++) {
      await q;
      expect(q.state).toBe("fulfilled");
      expect(q.value).toBe(i);
      q.reset();
      expect(log.starts).toBe(i + 1);
      expect(q.state).toBe("pending");
    }
    await q;
    expect(calls).toBe(6);
    stop();
    q.stop();
  });

  it("reset() while pending restarts synchronously, repeatedly", async () => {
    const pending: ReturnType<typeof deferred<number>>[] = [];
    const q = asyncOp(() => {
      const d = deferred<number>();
      pending.push(d);
      return d.promise;
    });
    const { log, stop } = keepAlive(q);
    expect(q.state).toBe("pending");
    for (let i = 2; i <= 4; i++) {
      q.reset();
      expect(log.starts).toBe(i);
      expect(q.state).toBe("pending");
    }
    // Abandoned runs settling late do not disturb the live one.
    pending[0]!.resolve(1);
    pending[1]!.resolve(2);
    await tick();
    expect(q.state).toBe("pending");
    pending.at(-1)!.resolve(99);
    await q;
    expect(q.value).toBe(99);
    expect(log.starts).toBe(4);
    stop();
    q.stop();
  });

  it("re-runs on each reset() and follows the run it started", async () => {
    const q = asyncOp(async () => "ok");
    const { log, stop } = keepAlive(q);
    await q;
    await tick();
    q.reset();
    await q;
    await tick();
    q.reset();
    await q;
    // start() writes from its own effect, so the keep-alive effect re-runs,
    // sees "pending", and then the settle.
    const cycle = ["idle", "pending", "fulfilled"];
    expect(log.states).toEqual([...cycle, ...cycle, ...cycle]);
    expect(log.starts).toBe(3);
    stop();
    q.stop();
  });

  it("restarts after reset() of a rejected run", async () => {
    const q = asyncOp(() => Promise.reject(new Error("x")));
    const { log, stop } = keepAlive(q);
    await q.catch(() => {});
    expect(q.state).toBe("rejected");
    q.reset();
    expect(log.starts).toBe(2);
    await q.catch(() => {});
    q.reset();
    expect(log.starts).toBe(3);
    await q.catch(() => {});
    stop();
    q.stop();
  });

  it("run() from the effect restarts after reset() too", async () => {
    let calls = 0;
    const q = asyncOp(async () => ++calls);
    const { log, stop } = keepAlive(q, "run");
    for (let i = 1; i <= 3; i++) {
      await q;
      q.reset();
      expect(log.starts).toBe(i + 1);
    }
    await q;
    expect(calls).toBe(4);
    stop();
    q.stop();
  });

  it("start() called tracked (no untracked) from the effect restarts after reset()", async () => {
    let starts = 0;
    const q = asyncOp(async () => undefined);
    const stop = effect(() => {
      if (q.state !== "idle") return;
      starts++;
      q.start();
    });
    expect(starts).toBe(1);
    await q;
    q.reset();
    expect(starts).toBe(2);
    q.reset();
    expect(starts).toBe(3);
    stop();
    q.stop();
  });

  it("reset() inside batch() restarts once at batch end", async () => {
    const q = asyncOp(async () => undefined);
    const { log, stop } = keepAlive(q);
    await q;
    batch(() => {
      q.reset();
      expect(log.starts).toBe(1);
    });
    expect(log.starts).toBe(2);
    batch(() => batch(() => q.reset()));
    expect(log.starts).toBe(3);
    stop();
    q.stop();
  });

  it("start() inside batch() within the effect, then reset()", async () => {
    let starts = 0;
    const q = asyncOp(async () => undefined);
    const stop = effect(() => {
      if (q.state !== "idle") return;
      untracked(() => {
        starts++;
        batch(() => q.start());
      });
    });
    expect(starts).toBe(1);
    q.reset();
    expect(starts).toBe(2);
    q.reset();
    expect(starts).toBe(3);
    stop();
    q.stop();
  });

  it("an unrelated observer of state sees the reset and the restart once each", async () => {
    const q = asyncOp(async () => undefined);
    const seen: string[] = [];
    const watch = effect(() => {
      seen.push(q.state);
    });
    const { log, stop } = keepAlive(q);
    await q;
    seen.length = 0;
    q.reset();
    // One run per transition: the reset, then the restart.
    expect(seen).toEqual(["idle", "pending"]);
    expect(log.starts).toBe(2);
    watch();
    stop();
    q.stop();
  });

  it("stopped keep-alive effect does not restart on reset()", async () => {
    const q = asyncOp(async () => undefined);
    const { log, stop } = keepAlive(q);
    await q;
    stop();
    q.reset();
    await tick();
    expect(log.starts).toBe(1);
    expect(q.state).toBe("idle");
  });
});
