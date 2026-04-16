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

  it("last onCleanup registration wins within a single run", () => {
    const first = vi.fn();
    const last = vi.fn();
    const stop = effect(() => {
      onCleanup(first);
      onCleanup(last); // overwrites first
    });
    stop();
    expect(first).not.toHaveBeenCalled();
    expect(last).toHaveBeenCalledTimes(1);
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
