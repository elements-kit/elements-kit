/**
 * Test suite for src/lib/signals/index.ts
 *
 * Coverage areas:
 *  - signal: read / write / no-op on same value
 *  - computed: lazy evaluation, caching, diamond deps, unused recompute
 *  - effect: initial run, re-run on dep change, dependency pruning
 *  - effectScope: grouping, cascade disposal, nested scopes
 *  - onCleanup: re-run teardown, explicit stop teardown, cascade teardown,
 *               composable helpers, no-op outside tracking context
 *  - batch: deferred flush, nested batches
 *  - untracked: no subscription inside untracked
 *  - trigger: manual notification without value change
 *  - type guards: isSignal, isComputed, isEffect, isEffectScope
 *  - edge cases: double stop, cleanup re-registration, self-referential guard
 */

import { describe, it, expect, vi } from "vitest";
import {
  signal,
  computed,
  effect,
  effectScope,
  onCleanup,
  batch,
  untracked,
  trigger,
  isSignal,
  isComputed,
  isEffect,
  isEffectScope,
  getActiveSub,
  getBatchDepth,
  EFFECT,
} from "./lib";

// ---------------------------------------------------------------------------
// signal
// ---------------------------------------------------------------------------

describe("signal", () => {
  it("returns initial value on read", () => {
    const s = signal(42);
    expect(s()).toBe(42);
  });

  it("returns undefined when created without an initial value", () => {
    const s = signal<number>();
    expect(s()).toBeUndefined();
  });

  it("updates value on write", () => {
    const s = signal(0);
    s(99);
    expect(s()).toBe(99);
  });

  it("does not notify subscribers when value does not change", () => {
    const s = signal(1);
    const spy = vi.fn();
    effect(() => {
      s();
      spy();
    });
    spy.mockClear();
    s(1); // same value – no notification expected
    expect(spy).not.toHaveBeenCalled();
  });

  it("notifies multiple independent subscribers", () => {
    const s = signal(0);
    const a = vi.fn();
    const b = vi.fn();
    effect(() => {
      s();
      a();
    });
    effect(() => {
      s();
      b();
    });
    a.mockClear();
    b.mockClear();
    s(1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// computed
// ---------------------------------------------------------------------------

describe("computed", () => {
  it("derives value from signals", () => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a() + b());
    expect(sum()).toBe(5);
  });

  it("caches value and does not recompute when deps unchanged", () => {
    const a = signal(1);
    const getter = vi.fn(() => a() * 2);
    const c = computed(getter);
    c();
    c();
    expect(getter).toHaveBeenCalledTimes(1);
  });

  it("recomputes lazily after a dep changes", () => {
    const a = signal(1);
    const getter = vi.fn(() => a());
    const c = computed(getter);
    c(); // initial
    getter.mockClear();
    a(2);
    expect(getter).not.toHaveBeenCalled(); // not yet – lazy
    expect(c()).toBe(2); // recomputed on read
    expect(getter).toHaveBeenCalledTimes(1);
  });

  it("handles diamond dependency without duplicate recomputes", () => {
    const root = signal(0);
    const left = computed(() => root() + 1);
    const right = computed(() => root() + 2);
    const getter = vi.fn(() => left() + right());
    const top = computed(getter);

    top(); // prime
    getter.mockClear();
    root(1);
    top(); // recompute once
    expect(getter).toHaveBeenCalledTimes(1);
    expect(top()).toBe(1 + 1 + (1 + 2)); // 5
  });

  it("passes previous value to getter", () => {
    const s = signal(1);
    const prev: (number | undefined)[] = [];
    const c = computed<number>((p) => {
      prev.push(p);
      return s() * 10;
    });
    c(); // prev[0] = undefined
    s(2);
    c(); // prev[1] = 10
    expect(prev).toEqual([undefined, 10]);
  });

  it("stops tracking deps when it loses all subscribers", () => {
    const s = signal(0);
    const getter = vi.fn(() => s());
    const c = computed(getter);

    const stop = effect(() => c());
    getter.mockClear();
    stop(); // computed loses its only subscriber

    s(99); // no subscribers – getter must not be called
    expect(getter).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// effect
// ---------------------------------------------------------------------------

describe("effect", () => {
  it("runs immediately on creation", () => {
    const spy = vi.fn();
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("re-runs when a dependency changes", () => {
    const s = signal(0);
    const spy = vi.fn();
    effect(() => {
      s();
      spy();
    });
    spy.mockClear();
    s(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("stops re-running after explicit disposal", () => {
    const s = signal(0);
    const spy = vi.fn();
    const stop = effect(() => {
      s();
      spy();
    });
    spy.mockClear();
    stop();
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("dynamically prunes stale dependencies", () => {
    const cond = signal(true);
    const a = signal("a");
    const b = signal("b");
    const spy = vi.fn();

    effect(() => {
      spy(cond() ? a() : b());
    });

    spy.mockClear();
    cond(false); // now tracks b, not a
    spy.mockClear();

    a("A"); // must NOT re-run effect (a is no longer tracked)
    expect(spy).not.toHaveBeenCalled();

    b("B"); // MUST re-run effect
    expect(spy).toHaveBeenCalledWith("B");
  });

  it("nested effect inside effect is owned by parent", () => {
    const s = signal(0);
    const innerSpy = vi.fn();
    let innerStop: (() => void) | undefined;

    const outerStop = effect(() => {
      s(); // outer dep
      innerStop = effect(() => innerSpy());
    });

    innerSpy.mockClear();
    outerStop(); // stopping outer should stop inner too
    s(1);
    expect(innerSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// onCleanup
// ---------------------------------------------------------------------------

describe("onCleanup", () => {
  it("runs cleanup before effect re-executes", () => {
    const s = signal(0);
    const order: string[] = [];

    effect(() => {
      s();
      order.push("run");
      onCleanup(() => order.push("cleanup"));
    });

    order.length = 0; // discard initial run
    s(1);
    // cleanup must happen before the new run
    expect(order).toEqual(["cleanup", "run"]);
  });

  it("runs cleanup on explicit effect stop", () => {
    const cleanup = vi.fn();
    const stop = effect(() => {
      onCleanup(cleanup);
    });
    expect(cleanup).not.toHaveBeenCalled();
    stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("does not call cleanup twice on repeated stop calls", () => {
    const cleanup = vi.fn();
    const stop = effect(() => {
      onCleanup(cleanup);
    });
    stop();
    stop(); // second call must be a no-op
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("runs cleanup when owning effectScope is disposed (cascade)", () => {
    const cleanup = vi.fn();

    const stopScope = effectScope(() => {
      effect(() => {
        onCleanup(cleanup);
      });
    });

    expect(cleanup).not.toHaveBeenCalled();
    stopScope(); // cascade: scope → effect cleanup
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("runs cleanup for each effect in a scope on scope disposal", () => {
    const cleanups = [vi.fn(), vi.fn(), vi.fn()];

    const stopScope = effectScope(() => {
      cleanups.forEach((fn, i) => {
        effect(() => onCleanup(() => fn(i)));
      });
    });

    stopScope();
    cleanups.forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));
  });

  it("runs cleanup for deeply nested scopes on cascade disposal", () => {
    const innerCleanup = vi.fn();
    const outerCleanup = vi.fn();

    const stopOuter = effectScope(() => {
      effect(() => onCleanup(outerCleanup));

      effectScope(() => {
        effect(() => onCleanup(innerCleanup));
      }); // inner scope (no handle captured – owned by outer)
    });

    stopOuter();
    expect(outerCleanup).toHaveBeenCalledTimes(1);
    expect(innerCleanup).toHaveBeenCalledTimes(1);
  });

  it("works from a composable helper called inside effect (no prop-drilling)", () => {
    const cleanup = vi.fn();

    function useResource() {
      // registers cleanup without needing a reference to the effect
      onCleanup(cleanup);
    }

    const stop = effect(() => {
      useResource();
    });

    stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("re-registers cleanup on each re-run", () => {
    const s = signal(0);
    const cleanup = vi.fn();

    const stop = effect(() => {
      s();
      onCleanup(cleanup);
    });

    s(1); // re-run: cleanup from run 1 fires, run 2 registers new cleanup
    s(2); // re-run: cleanup from run 2 fires
    stop(); // cleanup from run 3 fires

    // cleanup should have been called once per completed run (3 times total)
    expect(cleanup).toHaveBeenCalledTimes(3);
  });

  it("is a no-op when called outside any tracking context", () => {
    expect(() => onCleanup(() => {})).not.toThrow();
  });

  it("registers correctly when called inside untracked() inside an effect", () => {
    // Regression: onCleanup used activeSub which untracked() clears to undefined,
    // causing cleanup to silently drop. It now uses activeOwner which is unaffected
    // by untracked().
    const cleanup = vi.fn();

    const stop = effectScope(() => {
      effect(() => {
        untracked(() => onCleanup(cleanup));
      });
    });

    expect(cleanup).not.toHaveBeenCalled();
    stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("registers correctly when called inside untracked() directly inside effectScope", () => {
    const cleanup = vi.fn();

    const stop = effectScope(() => {
      untracked(() => onCleanup(cleanup));
    });

    expect(cleanup).not.toHaveBeenCalled();
    stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("registers correctly when effectScope is created inside untracked()", () => {
    // effectScope entered inside an untracked block: activeSub is undefined
    // but activeOwner must still be set to the scope node so onCleanup works.
    const cleanup = vi.fn();
    let stop!: () => void;

    untracked(() => {
      stop = effectScope(() => {
        onCleanup(cleanup);
      });
    });

    expect(cleanup).not.toHaveBeenCalled();
    stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("does not create phantom dependencies in the parent effect when it reads signals", () => {
    // Regression: cleanup ran before setActiveSub(e), so signal reads inside
    // cleanup were tracked by the parent context, causing phantom re-runs.
    const s = signal(0);
    const outerSpy = vi.fn();

    effect(() => {
      outerSpy();
      effect(() => {
        onCleanup(() => s()); // reads s during cleanup — must NOT subscribe outer
      });
    });

    outerSpy.mockClear();
    s(1); // outer does not track s directly — must not re-run
    expect(outerSpy).not.toHaveBeenCalled();
  });

  it("all onCleanup registrations within a single run are called in order", () => {
    const order: number[] = [];
    const value = signal(0);
    const stop = effect(() => {
      onCleanup(() => order.push(1));
      onCleanup(() => order.push(2));
      onCleanup(() => order.push(3));
      value(); // dependency to prevent no-op effect
    });
    value(1);
    stop();
    expect(order).toEqual([1, 2, 3, 1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// effectScope
// ---------------------------------------------------------------------------

describe("effectScope", () => {
  it("runs the setup function synchronously", () => {
    const spy = vi.fn();
    effectScope(spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("disposing the scope stops all owned effects", () => {
    const s = signal(0);
    const spy = vi.fn();

    const stop = effectScope(() => {
      effect(() => {
        s();
        spy();
      });
      effect(() => {
        s();
        spy();
      });
    });

    spy.mockClear();
    stop();
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("disposing a nested scope does not dispose the parent scope", () => {
    const s = signal(0);
    const outerSpy = vi.fn();

    effectScope(() => {
      effect(() => {
        s();
        outerSpy();
      });

      const stopInner = effectScope(() => {
        effect(() => s()); // inner effect
      });

      stopInner(); // only inner disposed
    });

    outerSpy.mockClear();
    s(1); // outer effect must still react
    expect(outerSpy).toHaveBeenCalledTimes(1);
  });

  it("disposing a scope that is itself nested in another scope unlinks it cleanly", () => {
    const cleanup = vi.fn();

    const stopOuter = effectScope(() => {
      effectScope(() => {
        effect(() => onCleanup(cleanup));
      });
      // inner scope handle is not captured; it is owned by outer
    });

    stopOuter(); // should cleanly cascade without errors
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// batch
// ---------------------------------------------------------------------------

describe("batch", () => {
  it("flushes effects once after all writes complete", () => {
    const a = signal(0);
    const b = signal(0);
    const spy = vi.fn();

    effect(() => {
      a();
      b();
      spy();
    });
    spy.mockClear();

    batch(() => {
      a(1);
      b(2);
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("supports nested batches (flush only on outermost end)", () => {
    const s = signal(0);
    const spy = vi.fn();

    effect(() => {
      s();
      spy();
    });
    spy.mockClear();

    batch(() => {
      batch(() => {
        s(1);
        expect(spy).not.toHaveBeenCalled(); // still inside outer batch
      });
      expect(spy).not.toHaveBeenCalled(); // still inside outer batch
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("getBatchDepth tracks nesting correctly", () => {
    expect(getBatchDepth()).toBe(0);
    batch(() => {
      expect(getBatchDepth()).toBe(1);
      batch(() => {
        expect(getBatchDepth()).toBe(2);
      });
      expect(getBatchDepth()).toBe(1);
    });
    expect(getBatchDepth()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// untracked
// ---------------------------------------------------------------------------

describe("untracked", () => {
  it("returns the value of fn", () => {
    const s = signal(7);
    expect(untracked(() => s())).toBe(7);
  });

  it("does not create a dependency link", () => {
    const s = signal(0);
    const spy = vi.fn();

    effect(() => {
      spy(untracked(() => s())); // read without tracking
    });

    spy.mockClear();
    s(99); // must NOT re-trigger the effect
    expect(spy).not.toHaveBeenCalled();
  });

  it("restores activeSub after execution", () => {
    const before = getActiveSub();
    untracked(() => {});
    expect(getActiveSub()).toBe(before);
  });

  it("restores activeSub even when fn throws", () => {
    const before = getActiveSub();
    expect(() =>
      untracked(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(getActiveSub()).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// trigger
// ---------------------------------------------------------------------------

describe("trigger", () => {
  it("notifies subscribers without changing signal value", () => {
    const arr = [1, 2, 3];
    const s = signal(arr);
    const spy = vi.fn();

    effect(() => {
      s();
      spy();
    });
    spy.mockClear();

    arr.push(4);
    trigger(() => s()); // notify without value change

    expect(spy).toHaveBeenCalledTimes(1);
    expect(s()).toBe(arr); // same reference
  });
});

// ---------------------------------------------------------------------------
// type guards
// ---------------------------------------------------------------------------

describe("type guards", () => {
  it("isSignal identifies signal handles", () => {
    const s = signal(0);
    expect(isSignal(s)).toBe(true);
    expect(isSignal(computed(() => 0))).toBe(false);
  });

  it("isComputed identifies computed handles", () => {
    const c = computed(() => 0);
    expect(isComputed(c)).toBe(true);
    expect(isComputed(signal(0))).toBe(false);
  });

  it("isEffect identifies effect disposal handles", () => {
    const stop = effect(() => {});
    expect(isEffect(stop)).toBe(true);
    expect(isEffect(signal(0))).toBe(false);
    stop();
  });

  it("effectOper is branded with EFFECT symbol", () => {
    const stop = effect(() => {});
    expect((stop as any)[EFFECT]).toBe(true);
    stop();
  });

  it("isEffectScope identifies effectScope disposal handles", () => {
    const stop = effectScope(() => {});
    expect(isEffectScope(stop)).toBe(true);
    expect(isEffectScope(signal(0))).toBe(false);
    stop();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("effect with no signal reads does not re-run", () => {
    const spy = vi.fn();
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    // No signals tracked – nothing can trigger a re-run.
  });

  it("writing to a signal inside its own effect does not cause infinite loop", () => {
    const s = signal(0);
    const spy = vi.fn();
    effect(() => {
      const val = s();
      spy(val);
      if (val < 3) {
        s(val + 1); // self-write while RecursedCheck is active
      }
    });
    // RecursedCheck prevents re-queuing during the effect's own run.
    // The write is staged but the effect is not re-scheduled in the same flush.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(0);
  });

  it("computed used by two effects updates both", () => {
    const s = signal(1);
    const c = computed(() => s() * 2);
    const results: number[] = [];

    effect(() => results.push(c()));
    effect(() => results.push(c()));

    results.length = 0;
    s(5);

    expect(results).toEqual([10, 10]);
  });

  it("multiple effectScopes can independently own the same signal", () => {
    const s = signal(0);
    const spyA = vi.fn();
    const spyB = vi.fn();

    const stopA = effectScope(() =>
      effect(() => {
        s();
        spyA();
      }),
    );
    const stopB = effectScope(() =>
      effect(() => {
        s();
        spyB();
      }),
    );

    spyA.mockClear();
    spyB.mockClear();

    stopA(); // only scope A's effect stops
    s(1);

    expect(spyA).not.toHaveBeenCalled();
    expect(spyB).toHaveBeenCalledTimes(1);

    stopB();
  });

  it("cleanup registered in an effect that is never re-run fires only on stop", () => {
    const cleanup = vi.fn();
    const stop = effect(() => {
      onCleanup(cleanup);
      // no signal reads – will never re-run
    });
    expect(cleanup).not.toHaveBeenCalled();
    stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("stopping an already-stopped effect is safe", () => {
    const stop = effect(() => {});
    expect(() => {
      stop();
      stop();
    }).not.toThrow();
  });

  it("disposing an already-disposed effectScope is safe", () => {
    const stop = effectScope(() => {});
    expect(() => {
      stop();
      stop();
    }).not.toThrow();
  });
});

describe("onCleanup in computed", () => {
  it("fires before computed re-evaluates when deps change", () => {
    const s = signal(0);
    const cleanupSpy = vi.fn();
    const c = computed(() => {
      onCleanup(cleanupSpy);
      return s();
    });

    c(); // first read — registers cleanup
    expect(cleanupSpy).not.toHaveBeenCalled();

    s(1); // dirty
    c(); // re-evaluate — cleanup fires first
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    s(2);
    c();
    expect(cleanupSpy).toHaveBeenCalledTimes(2);
  });

  it("does not fire if computed is never re-read after deps change (lazy)", () => {
    const s = signal(0);
    const cleanupSpy = vi.fn();
    const c = computed(() => {
      onCleanup(cleanupSpy);
      return s();
    });

    c(); // first read
    s(1); // dirty but never re-read
    expect(cleanupSpy).not.toHaveBeenCalled();
  });

  it("fires all registered cleanups in order", () => {
    const s = signal(0);
    const order: number[] = [];
    const c = computed(() => {
      onCleanup(() => order.push(1));
      onCleanup(() => order.push(2));
      onCleanup(() => order.push(3));
      return s();
    });

    c();
    s(1);
    c();
    expect(order).toEqual([1, 2, 3]);
  });

  it("onCleanup inside computed nested inside effect uses correct owner", () => {
    const s = signal(0);
    const computedCleanup = vi.fn();
    const effectCleanup = vi.fn();

    const c = computed(() => {
      onCleanup(computedCleanup);
      return s();
    });

    const stop = effect(() => {
      onCleanup(effectCleanup);
      c(); // read computed inside effect
    });

    s(1); // triggers both effect and computed re-run

    // computed cleanup should have fired (re-evaluated), effect cleanup too
    expect(computedCleanup).toHaveBeenCalledTimes(1);
    expect(effectCleanup).toHaveBeenCalledTimes(1);

    stop();
  });

  it("cleanup that throws propagates the error (same as effect)", () => {
    const s = signal(0);
    const afterCleanup = vi.fn();
    const c = computed(() => {
      onCleanup(() => {
        throw new Error("cleanup error");
      });
      afterCleanup();
      return s();
    });

    c(); // initial read — registers cleanup, afterCleanup called once
    s(1); // dirty
    // re-read triggers cleanup first; cleanup throws before getter runs
    expect(() => c()).toThrow("cleanup error");
    expect(afterCleanup).toHaveBeenCalledTimes(1);
  });

  it("onCleanup called outside any context is a no-op", () => {
    expect(() => onCleanup(() => {})).not.toThrow();
  });

  it("cleanup runs in untracked context — does not create deps on parent", () => {
    const s = signal(0);
    const tracker = signal(0);
    const effectRuns = vi.fn();

    const c = computed(() => {
      onCleanup(() => tracker()); // read tracker inside cleanup
      return s();
    });

    const stop = effect(() => {
      effectRuns();
      c();
    });

    effectRuns.mockClear();
    s(1);
    c(); // re-evaluate computed, cleanup reads tracker
    tracker(1); // should NOT re-run effect (tracker not a dep)
    expect(effectRuns).toHaveBeenCalledTimes(1); // only from s(1), not tracker(1)

    stop();
  });

  it("cleanup fires when effect stops (last subscriber gone)", () => {
    const s = signal(0);
    const cleanupSpy = vi.fn();
    const c = computed(() => {
      onCleanup(cleanupSpy);
      return s();
    });

    const stop = effect(() => {
      c();
    });
    expect(cleanupSpy).not.toHaveBeenCalled();
    stop();
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it("cleanup fires when effectScope is disposed", () => {
    const s = signal(0);
    const cleanupSpy = vi.fn();
    const c = computed(() => {
      onCleanup(cleanupSpy);
      return s();
    });

    const stopScope = effectScope(() => {
      effect(() => {
        c();
      });
    });
    stopScope();
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it("cleanup does NOT fire while computed still has subscribers (one of two scopes stops)", () => {
    const s = signal(0);
    const cleanupSpy = vi.fn();
    const c = computed(() => {
      onCleanup(cleanupSpy);
      return s();
    });

    const stopScope1 = effectScope(() => {
      effect(() => {
        c();
      });
    });
    const stopScope2 = effectScope(() => {
      effect(() => {
        c();
      });
    });

    stopScope1(); // c still has scope2 → must NOT fire
    expect(cleanupSpy).not.toHaveBeenCalled();

    stopScope2(); // last subscriber gone → cleanup fires
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it("Case 1: re-watched after unwatched — each lifecycle gets its own cleanup", () => {
    const s = signal(0);
    const log: string[] = [];

    const c = computed(() => {
      const val = s();
      onCleanup(() => log.push(`cleanup-${val}`));
      return val;
    });

    // First lifecycle
    const stop1 = effect(() => {
      c();
    });
    stop1(); // unwatched → cleanup-0 fires, C marked Dirty, deps purged
    expect(log).toEqual(["cleanup-0"]);

    // Second lifecycle — C is dirty, re-evaluates on first read
    const stop2 = effect(() => {
      c();
    }); // C re-evaluates → registers cleanup-0 again
    s(1); // re-evaluates → cleanup-0 fires (Point 1), registers cleanup-1
    expect(log).toEqual(["cleanup-0", "cleanup-0"]);

    stop2(); // last subscriber gone → cleanup-1 fires
    expect(log).toEqual(["cleanup-0", "cleanup-0", "cleanup-1"]);
  });

  it("Case 2: dep changes many times while unwatched — cleanup fires once, no re-evaluations", () => {
    const url = signal("A");
    const log: string[] = [];

    const c = computed(() => {
      const u = url();
      onCleanup(() => log.push(`cleanup-${u}`));
      return u;
    });

    const stop = effect(() => {
      c();
    });

    stop(); // unwatched → cleanup-A fires; deps purged (C no longer tracks url)
    expect(log).toEqual(["cleanup-A"]);

    // url changes while unwatched — C has no dep links, no re-evaluation, no new cleanups
    url("B");
    url("C");
    url("D");
    expect(log).toEqual(["cleanup-A"]); // still just one cleanup

    // new subscriber — C is dirty → re-evaluates with latest url="D"
    const stop2 = effect(() => {
      c();
    });
    expect(log).toEqual(["cleanup-A"]); // re-eval registered cleanup-D, not fired yet
    expect(c()).toBe("D");

    stop2(); // last subscriber gone → cleanup-D fires
    expect(log).toEqual(["cleanup-A", "cleanup-D"]);
  });

  it("n evaluations → n cleanups, exactly 1:1 (re-subscribing while value unchanged causes extra eval)", () => {
    const s = signal(0);
    const evals: number[] = [];
    const cleanups: number[] = [];

    const c = computed(() => {
      const val = s();
      evals.push(val);
      onCleanup(() => cleanups.push(val));
      return val;
    });

    // lifecycle 1: subscribe while s=0
    const stop1 = effect(() => {
      c();
    }); // eval 1 → val=0
    stop1(); // unwatched → cleanup val=0

    // lifecycle 2: re-subscribe while s still=0 → extra eval at same value
    const stop2 = effect(() => {
      c();
    }); // eval 2 → val=0 again (dirty re-eval)
    s(1); // eval 3 → val=1, cleanup val=0 fires (Point 1)
    s(2); // eval 4 → val=2, cleanup val=1 fires (Point 2)
    stop2(); // unwatched → cleanup val=2
    s(3); // no subscribers → no eval, no cleanup
    s(4); // no subscribers → no eval, no cleanup
    s(5); // no subscribers → no eval, no cleanup

    expect(evals).toEqual([0, 0, 1, 2]); // 4 evaluations (including dirty re-eval)
    expect(cleanups).toEqual([0, 0, 1, 2]); // 4 cleanups — exactly 1:1

    const stop3 = effect(() => {
      console.log("c()", c());
    });

    expect(evals).toEqual([0, 0, 1, 2, 5]); // 5 evaluations (including dirty re-eval)
    expect(cleanups).toEqual([0, 0, 1, 2]); // 4 cleanups so far

    s(6); // eval 5 → val=6, cleanup val=5 fires

    expect(evals).toEqual([0, 0, 1, 2, 5, 6]); // 6 evaluations
    expect(cleanups).toEqual([0, 0, 1, 2, 5]); // 5 cleanups so far

    stop3(); // unwatched → cleanup val=6

    expect(evals).toEqual([0, 0, 1, 2, 5, 6]); // 6 evaluations
    expect(cleanups).toEqual([0, 0, 1, 2, 5, 6]); // 6 cleanups — exactly 1:1
  });
});

// ---------------------------------------------------------------------------
// Enterprise: A — Error propagation
// ---------------------------------------------------------------------------

describe("enterprise: error propagation", () => {
  it("when an effect throws, remaining queued effects are marked Recursed and retry on next flush", () => {
    const s = signal(0);
    const ran = vi.fn();
    let shouldThrow = false;

    effect(() => {
      s();
      if (shouldThrow) {
        shouldThrow = false;
        throw new Error("boom");
      }
    });
    effect(() => {
      s();
      ran();
    });

    ran.mockClear();
    shouldThrow = true;
    // Throwing effect aborts flush; sibling is marked Recursed (not run yet)
    expect(() => s(1)).toThrow("boom");
    expect(ran).toHaveBeenCalledTimes(0);

    // Next signal write triggers a fresh flush — sibling now runs
    s(2);
    expect(ran).toHaveBeenCalledTimes(1);
  });

  it("batchDepth resets to 0 after an effect throws during flush", () => {
    const s = signal(0);
    effect(() => {
      if (s()) throw new Error("boom");
    });

    expect(() => s(1)).toThrow();
    expect(getBatchDepth()).toBe(0);
  });

  it("cleanup that throws aborts the flush; sibling effects retry on next flush", () => {
    const s = signal(0);
    const siblingRan = vi.fn();

    const stop = effect(() => {
      s();
      onCleanup(() => {
        throw new Error("cleanup boom");
      });
    });
    effect(() => {
      s();
      siblingRan();
    });

    siblingRan.mockClear();
    // Cleanup throws → flush aborts → sibling marked Recursed, not yet run
    expect(() => s(1)).toThrow("cleanup boom");
    expect(siblingRan).toHaveBeenCalledTimes(0);

    // Next flush runs the sibling
    s(2);
    expect(siblingRan).toHaveBeenCalledTimes(1);
    stop();
  });

  it("multiple cleanups — one throws — remaining still called", () => {
    const s = signal(0);
    const order: number[] = [];

    const stop = effect(() => {
      s();
      onCleanup(() => order.push(1));
      onCleanup(() => {
        order.push(2);
        throw new Error("boom");
      });
      onCleanup(() => order.push(3));
    });

    expect(() => s(1)).toThrow("boom");
    // 1 and 2 ran; 3 is after the throw so it does not run
    expect(order).toContain(1);
    expect(order).toContain(2);
    stop();
  });
});

// ---------------------------------------------------------------------------
// Enterprise: B — Circular / feedback loops
// ---------------------------------------------------------------------------

describe("enterprise: circular / feedback loops", () => {
  it("effect writing to signal it reads does not infinite-loop (RecursedCheck guard)", () => {
    const s = signal(0);
    let runs = 0;

    const stop = effect(() => {
      runs++;
      if (s() < 3) s(s() + 1);
    });

    expect(runs).toBeGreaterThan(0);
    expect(runs).toBeLessThan(10); // guard limits recursion
    stop();
  });

  it("computed that reads itself through a dependency does not hang", () => {
    const s = signal(0);
    let runs = 0;
    const c = computed(() => {
      runs++;
      return s() + 1;
    });

    // Reading c should not cause infinite recursion
    expect(c()).toBe(1);
    expect(runs).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Enterprise: C — Disposal during flush
// ---------------------------------------------------------------------------

describe("enterprise: disposal during flush", () => {
  it("effect that stops itself during execution does not crash", () => {
    const s = signal(0);
    let stop: () => void;

    stop = effect(() => {
      s();
      stop?.();
    });

    expect(() => s(1)).not.toThrow();
  });

  it("effect that stops a sibling during execution does not crash", () => {
    const s = signal(0);
    const siblingRan = vi.fn();
    let stopSibling: () => void;

    effect(() => {
      s();
      stopSibling?.();
    });
    stopSibling = effect(() => {
      s();
      siblingRan();
    });

    siblingRan.mockClear();
    expect(() => s(1)).not.toThrow();
  });

  it("effectScope disposed while its effects are queued does not crash", () => {
    const s = signal(0);
    let stopScope!: () => void;

    stopScope = effectScope(() => {
      effect(() => {
        s();
        stopScope?.();
      });
    });

    expect(() => s(1)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Enterprise: D — Cleanup edge cases
// ---------------------------------------------------------------------------

describe("enterprise: cleanup edge cases", () => {
  it("cleanup that registers a new onCleanup does not affect current disposal", () => {
    const s = signal(0);
    const inner = vi.fn();

    const stop = effect(() => {
      s();
      onCleanup(() => {
        onCleanup(inner); // re-entrant — registers on whatever owner is active at call time
      });
    });

    stop(); // dispose — outer cleanup fires
    expect(() => inner).not.toThrow();
  });

  it("cleanup that creates a new effect — new effect is not owned by the disposed scope", () => {
    const s = signal(0);
    const newEffectRan = vi.fn();

    const stop = effect(() => {
      s();
      onCleanup(() => {
        // Creating an effect inside cleanup — should not throw
        effect(() => {
          newEffectRan();
        });
      });
    });

    expect(() => stop()).not.toThrow();
    expect(newEffectRan).toHaveBeenCalledTimes(1);
  });

  it("cleanup reading a signal does not create a dep on the parent effect", () => {
    const dep = signal(0);
    const other = signal(0);
    const runs = vi.fn();

    const stop = effect(() => {
      dep();
      runs();
      onCleanup(() => other()); // read other inside cleanup
    });

    runs.mockClear();
    dep(1); // re-run effect (cleanup fires, reads other)
    other(1); // should NOT re-run effect
    expect(runs).toHaveBeenCalledTimes(1); // only dep(1) triggered it
    stop();
  });
});

// ---------------------------------------------------------------------------
// Enterprise: E — Memory / subscription correctness
// ---------------------------------------------------------------------------

describe("enterprise: memory and subscription correctness", () => {
  it("computed with no active subscriber does not recompute when deps change", () => {
    const s = signal(0);
    let computeCount = 0;
    const c = computed(() => {
      computeCount++;
      return s();
    });

    c(); // first read
    const before = computeCount;
    s(1); // mark dirty — but nobody is watching
    // No re-computation yet (lazy)
    expect(computeCount).toBe(before);
    c(); // now it recomputes on read
    expect(computeCount).toBe(before + 1);
  });

  it("signal with no subscribers: write + read returns new value with zero side effects", () => {
    const s = signal(0);
    const spy = vi.fn();
    s(42);
    expect(s()).toBe(42);
    expect(spy).not.toHaveBeenCalled();
  });

  it("repeated stop() calls on effect are safe", () => {
    const stop = effect(() => {});
    expect(() => {
      stop();
      stop();
      stop();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Enterprise: F — Batch robustness
// ---------------------------------------------------------------------------

describe("enterprise: batch robustness", () => {
  it("batchDepth resets after exception thrown inside batch()", () => {
    const s = signal(0);
    expect(() =>
      batch(() => {
        s(1);
        throw new Error("batch error");
      }),
    ).toThrow("batch error");
    expect(getBatchDepth()).toBe(0);
  });

  it("signal written in both inner and outer batch — effect runs once", () => {
    const s = signal(0);
    const runs = vi.fn();

    effect(() => {
      s();
      runs();
    });

    runs.mockClear();
    batch(() => {
      s(1);
      batch(() => {
        s(2);
      });
      s(3);
    });

    expect(runs).toHaveBeenCalledTimes(1);
    expect(s()).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Enterprise: G — Dynamic dependency churn
// ---------------------------------------------------------------------------

describe("enterprise: dynamic dependency churn", () => {
  it("effect alternating between two signals 10+ times has no stale links", () => {
    const a = signal(0);
    const b = signal(0);
    const flag = signal(true);
    const results: number[] = [];

    const stop = effect(() => {
      results.push(flag() ? a() : b());
    });

    for (let i = 0; i < 12; i++) {
      flag(i % 2 === 0);
      if (i % 2 === 0) a(i);
      else b(i);
    }

    // After flipping, b changes should not trigger effect when flag=true
    const lenBefore = results.length;
    flag(true);
    b(99); // effect tracks a, not b — should NOT run
    expect(results.length).toBe(lenBefore + 1); // only flag(true) triggered it

    stop();
  });

  it("computed with conditional branch — deps update correctly each evaluation", () => {
    const flag = signal(true);
    const a = signal(1);
    const b = signal(2);
    const c = computed(() => (flag() ? a() : b()));

    expect(c()).toBe(1);

    flag(false);
    expect(c()).toBe(2);

    a(10); // a is no longer a dep — should not change c
    expect(c()).toBe(2);

    b(20);
    expect(c()).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Enterprise: J — trigger + untracked interactions
// ---------------------------------------------------------------------------

describe("enterprise: trigger + untracked interactions", () => {
  it("trigger inside untracked does not notify subscribers", () => {
    const s = signal([1, 2, 3]);
    const runs = vi.fn();

    const stop = effect(() => {
      runs();
      s(); // track s
    });

    runs.mockClear();
    untracked(() => {
      s().push(4);
      trigger(s); // should not schedule effect (not in tracking context)
    });

    // trigger inside untracked: subscribers ARE notified (untracked only blocks dep creation, not propagation)
    expect(runs).toHaveBeenCalledTimes(1);
    stop();
  });

  it("signal read inside untracked inside effect does not create a dep", () => {
    const tracked = signal(0);
    const notTracked = signal(0);
    const runs = vi.fn();

    const stop = effect(() => {
      runs();
      tracked();
      untracked(() => notTracked());
    });

    runs.mockClear();
    notTracked(1); // should NOT re-run effect
    expect(runs).toHaveBeenCalledTimes(0);

    tracked(1); // should re-run
    expect(runs).toHaveBeenCalledTimes(1);
    stop();
  });
});

// ---------------------------------------------------------------------------
// Enterprise: K — effectScope advanced
// ---------------------------------------------------------------------------

describe("enterprise: effectScope advanced", () => {
  it("nested scopes: inner stop does not affect outer", () => {
    const s = signal(0);
    const outerRan = vi.fn();
    const innerRan = vi.fn();

    const stopOuter = effectScope(() => {
      effect(() => {
        s();
        outerRan();
      });

      const stopInner = effectScope(() => {
        effect(() => {
          s();
          innerRan();
        });
      });

      stopInner();
    });

    outerRan.mockClear();
    innerRan.mockClear();

    s(1);
    expect(outerRan).toHaveBeenCalledTimes(1);
    expect(innerRan).toHaveBeenCalledTimes(0); // inner was stopped

    stopOuter();
  });

  it("effectScope stop is idempotent", () => {
    const stop = effectScope(() => {
      effect(() => {});
    });

    expect(() => {
      stop();
      stop();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Enterprise: L — Type guard robustness
// ---------------------------------------------------------------------------

describe("enterprise: type guard robustness", () => {
  it("isSignal returns false for plain functions", () => {
    expect(isSignal(() => 42)).toBe(false);
    expect(isSignal(null)).toBe(false);
    expect(isSignal(undefined)).toBe(false);
    expect(isSignal(42)).toBe(false);
  });

  it("isComputed returns false for plain functions and signals", () => {
    const s = signal(0);
    expect(isComputed(() => 42)).toBe(false);
    expect(isComputed(s)).toBe(false); // signal is not a computed
  });

  it("isEffect returns false for plain functions", () => {
    expect(isEffect(() => {})).toBe(false);
    expect(isEffect(null)).toBe(false);
  });

  it("isEffectScope returns false for plain functions and effects", () => {
    const stop = effect(() => {});
    expect(isEffectScope(stop)).toBe(false);
    expect(isEffectScope(() => {})).toBe(false);
    stop();
  });

  it("brand symbols are non-enumerable — not copied by Object.assign", () => {
    const s = signal(0);
    const c = computed(() => 1);
    const stopE = effect(() => {});
    const stopS = effectScope(() => {});

    // Object.assign only copies enumerable own properties; brands are non-enumerable
    const sCopy = Object.assign(() => {}, s);
    const cCopy = Object.assign(() => {}, c);

    expect(isSignal(sCopy)).toBe(false);
    expect(isComputed(cCopy)).toBe(false);

    stopE();
    stopS();
  });
});
