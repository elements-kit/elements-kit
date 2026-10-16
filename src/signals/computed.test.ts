import { describe, expect, it, vi } from "vitest";
import {
  computed,
  effect,
  effectScope,
  onCleanup,
  signal,
  trigger,
  untracked,
} from "./lib";
import type { Signal } from "./index";

describe("computed basics", () => {
  /** An effect whose apply step runs untracked. */
  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }

  it("should store and return value on read", () => {
    const $x = signal(1);
    const $y = signal(1);
    const $a = computed(() => $x() + $y());
    expect($a()).toBe(2);
    expect($a()).toBe(2);
  });

  it("should update when dependency is updated", () => {
    const $x = signal(1);
    const $y = signal(1);
    const $a = computed(() => $x() + $y());
    $x(2);
    expect($a()).toBe(3);
    $y(2);
    expect($a()).toBe(4);
  });

  it("should update when deep dependency is updated", () => {
    const $x = signal(1);
    const $y = signal(1);
    const $a = computed(() => $x() + $y());
    const $b = computed(() => $a());
    $x(2);
    expect($b()).toBe(3);
  });

  it("should update when deep computed dependency is updated", () => {
    const $x = signal(10);
    const $y = signal(10);
    const $a = computed(() => $x() + $y());
    const $b = computed(() => $a());
    const $c = computed(() => $b());
    $x(20);
    expect($c()).toBe(30);
  });

  it("should only re-compute when needed", () => {
    const fn = vi.fn();
    const $x = signal(10);
    const $y = signal(10);
    const $a = computed(() => fn($x() + $y()));
    // Lazy: nothing runs until the first read.
    expect(fn).toHaveBeenCalledTimes(0);
    $a();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(20);

    $a();
    expect(fn).toHaveBeenCalledTimes(1);

    $x(20);
    expect(fn).toHaveBeenCalledTimes(1);
    $a();
    expect(fn).toHaveBeenCalledTimes(2);

    $y(20);
    expect(fn).toHaveBeenCalledTimes(2);
    $a();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("an unobserved computed recomputes only when read after a change", () => {
    const fn = vi.fn((v: number) => v);
    const $x = signal(0);
    const $a = computed(() => fn($x()));
    expect($a()).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
    expect($a()).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
    $x(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect($a()).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
    expect($a()).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("an unobserved chain re-runs only the changed branch on read", () => {
    const memoA = vi.fn((n: number) => n);
    const memoB = vi.fn((n: number) => n);
    const $x = signal(10);
    const $y = signal(10);
    const $a = computed(() => memoA($x()));
    const $b = computed(() => memoB($y()));
    const $c = computed(() => $a() + $b());

    // Lazy: nothing runs until read.
    expect(memoA).toHaveBeenCalledTimes(0);
    expect($c()).toBe(20);
    expect(memoA).toHaveBeenCalledTimes(1);
    expect(memoB).toHaveBeenCalledTimes(1);

    $x(20);
    expect(memoA).toHaveBeenCalledTimes(1);
    expect(memoB).toHaveBeenCalledTimes(1);
    expect($c()).toBe(30);
    // Only the changed branch re-runs.
    expect(memoA).toHaveBeenCalledTimes(2);
    expect(memoB).toHaveBeenCalledTimes(1);

    $y(20);
    expect($c()).toBe(40);
    expect(memoA).toHaveBeenCalledTimes(2);
    expect(memoB).toHaveBeenCalledTimes(2);
  });

  it("observed computeds stay subscribed", () => {
    const memoA = vi.fn((n: number) => n);
    const memoB = vi.fn((n: number) => n);
    const $x = signal(10);
    const $y = signal(10);
    let value: number | undefined;

    effectScope(() => {
      const $a = computed(() => memoA($x()));
      const $b = computed(() => memoB($y()));
      const $c = computed(() => $a() + $b());
      applyEffect(
        () => (value = $c()),
        () => {},
      );
    });

    expect(value).toBe(20);
    expect(memoA).toHaveBeenCalledTimes(1);
    expect(memoB).toHaveBeenCalledTimes(1);

    $x(20);
    expect(value).toBe(30);
    expect(memoA).toHaveBeenCalledTimes(2);
    expect(memoB).toHaveBeenCalledTimes(1);

    $y(20);
    expect(value).toBe(40);
    expect(memoA).toHaveBeenCalledTimes(2);
    expect(memoB).toHaveBeenCalledTimes(2);
  });

  it("should discover new dependencies", () => {
    const $x = signal(1);
    const $y = signal(0);
    const $c = computed(() => ($x() ? $x() : $y()));
    expect($c()).toBe(1);
    $x(0);
    expect($c()).toBe(0);
    $y(10);
    expect($c()).toBe(10);
  });

  it("a getter that throws on the first read rethrows to the reader", () => {
    const $a = computed((): string => {
      throw Error("init");
    });
    expect(() => $a()).toThrow("init");
  });

  it("a lazy computed first read inside another computed tracks its deps", () => {
    const $x = signal(0);
    let innerRuns = 0;
    let outer!: () => number;

    effectScope(() => {
      const lazy = computed(() => {
        innerRuns++;
        return $x() + 1;
      });
      expect(innerRuns).toBe(0);
      outer = computed(() => lazy() * 2);
      expect(outer()).toBe(2);
      expect(innerRuns).toBe(1);
    });

    $x(5);
    expect(outer()).toBe(12);
    expect(innerRuns).toBe(2);
  });

  it("nested lazy computeds first read inside another computed track their deps", () => {
    const $x = signal(0);
    let eager!: () => number;
    effectScope(() => {
      const lazyOuter = computed(() => $x() + 1);
      const lazyInner = computed(() => lazyOuter() * 10);
      eager = computed(() => lazyInner() + 100);
      expect(eager()).toBe(110);
    });
    $x(5);
    expect(eager()).toBe(160);
  });
});

describe("computed propagation", () => {
  // `memo()` is a computed kept live by an effect. Getters returning `{}`
  // always count as changed; `forceSet` notifies even on the same value.

  function memo<T>(fn: () => T): () => T {
    const c = computed(fn);
    effect(() => {
      c();
    });
    return c;
  }

  /** Write that always notifies. */
  function forceSet<T>(s: Signal<T>, v: T) {
    if (untracked(() => s()) === v) trigger(s);
    else s(v);
  }

  const inScope = (fn: () => void) => effectScope(fn)();

  describe("propagation order", () => {
    it("propagates in topological order", () => {
      inScope(() => {
        let seq = "";
        const a1 = signal(false);
        const b1 = memo(() => {
          a1();
          seq += "b1";
          return {};
        });
        const b2 = memo(() => {
          a1();
          seq += "b2";
          return {};
        });
        memo(() => {
          (b1(), b2());
          seq += "c1";
          return {};
        });
        seq = "";
        a1(true);
        expect(seq).toBe("b1b2c1");
      });
    });

    it("only propagates once with linear convergences", () => {
      inScope(() => {
        const d = signal(0);
        const f1 = memo(() => d());
        const f2 = memo(() => d());
        const f3 = memo(() => d());
        const f4 = memo(() => d());
        const f5 = memo(() => d());
        let gcount = 0;
        memo(() => {
          gcount++;
          return f1() + f2() + f3() + f4() + f5();
        });
        gcount = 0;
        d(1);
        expect(gcount).toBe(1);
      });
    });

    it("only propagates once with exponential convergence", () => {
      inScope(() => {
        const d = signal(0);
        const f1 = memo(() => d());
        const f2 = memo(() => d());
        const f3 = memo(() => d());
        const g1 = memo(() => f1() + f2() + f3());
        const g2 = memo(() => f1() + f2() + f3());
        const g3 = memo(() => f1() + f2() + f3());
        let hcount = 0;
        memo(() => {
          hcount++;
          return g1() + g2() + g3();
        });
        hcount = 0;
        d(1);
        expect(hcount).toBe(1);
      });
    });

    it("does not trigger downstream computations unless changed", () => {
      inScope(() => {
        const s1 = signal(1);
        let order = "";
        const t1 = memo(() => {
          order += "t1";
          return s1();
        });
        memo(() => {
          order += "c1";
          t1();
        });
        expect(order).toBe("t1c1");
        order = "";
        forceSet(s1, 1);
        expect(order).toBe("t1");
        order = "";
        forceSet(s1, 2);
        expect(order).toBe("t1c1");
      });
    });

    it("notifies changed dependees depth-first from the source", () => {
      inScope(() => {
        const s1 = signal(0);
        let order = "";
        const t1 = memo(() => {
          order += "t1";
          return s1() === 0;
        });
        memo(() => {
          order += "c1";
          return s1();
        });
        memo(() => {
          order += "c2";
          return t1();
        });
        expect(order).toBe("t1c1c2");
        order = "";
        s1(1);
        expect(order).toBe("t1c2c1");
      });
    });

    it("updates downstream pending computations", () => {
      inScope(() => {
        const s1 = signal(0);
        const s2 = signal(0);
        let order = "";
        const t1 = memo(() => {
          order += "t1";
          return s1() === 0;
        });
        memo(() => {
          order += "c1";
          return s1();
        });
        memo(() => {
          order += "c2";
          t1();
          memo(() => {
            order += "c2_1";
            return s2();
          });
          return {};
        });
        order = "";
        s1(1);
        expect(order).toBe("t1c2c2_1c1");
      });
    });
  });

  describe("with changing dependencies", () => {
    let i: ReturnType<typeof signal<boolean>>;
    let t: ReturnType<typeof signal<number>>;
    let e: ReturnType<typeof signal<number>>;
    let fevals: number;
    let f: () => number;

    function init() {
      i = signal<boolean>(true);
      t = signal(1);
      e = signal(2);
      fevals = 0;
      f = memo(() => {
        fevals++;
        return i() ? t() : e();
      });
      fevals = 0;
    }

    it("updates on active dependencies", () => {
      inScope(() => {
        init();
        t(5);
        expect(fevals).toBe(1);
        expect(f()).toBe(5);
      });
    });

    it("does not update on inactive dependencies", () => {
      inScope(() => {
        init();
        e(5);
        expect(fevals).toBe(0);
        expect(f()).toBe(1);
      });
    });

    it("deactivates obsolete dependencies", () => {
      inScope(() => {
        init();
        i(false);
        fevals = 0;
        t(5);
        expect(fevals).toBe(0);
      });
    });

    it("activates new dependencies", () => {
      inScope(() => {
        init();
        i(false);
        fevals = 0;
        e(5);
        expect(fevals).toBe(1);
      });
    });

    it("ensures that new dependencies are updated before dependee", () => {
      inScope(() => {
        let order = "";
        const a = signal(0);
        const b = memo(() => {
          order += "b";
          return a() + 1;
        });
        const c = memo(() => {
          order += "c";
          const check = b();
          if (check) return check;
          return e();
        });
        const d = memo(() => a());
        const e = memo(() => {
          order += "d";
          return d() + 10;
        });

        expect(order).toBe("bcd");

        order = "";
        a(-1);
        expect(order).toBe("bcd");
        expect(c()).toBe(9);

        order = "";
        a(0);
        expect(order).toBe("bcd");
        expect(c()).toBe(1);
      });
    });
  });

  describe("with intercepting computations", () => {
    it("does not update subsequent pending computations after stale invocations", () => {
      inScope(() => {
        const s1 = signal(1);
        const s2 = signal(false);
        let count = 0;
        const t1 = memo(() => s1() > 0);
        const t2 = memo(() => s1() > 0);
        const c1 = memo(() => s1());
        const t3 = memo(() => {
          const a = s1();
          const b = s2();
          return a && b;
        });
        memo(() => {
          t1();
          t2();
          c1();
          t3();
          count++;
        });
        s2(true);
        expect(count).toBe(2);
        s1(2);
        expect(count).toBe(3);
      });
    });

    it("evaluates nested trackings", () => {
      inScope(() => {
        const s1 = signal(1);
        const s2 = signal(1);
        let count = 0;
        let c1!: () => number;
        memo(() => {
          c1 = memo(() => s2());
          return s1();
        });
        memo(() => {
          count++;
          c1();
        });
        s1(2);
        expect(count).toBe(1);
      });
    });

    it("propagates in topological order", () => {
      inScope(() => {
        const s1 = signal(true);
        let order = "";
        const t1 = memo(() => {
          order += "t1";
          return s1();
        });
        const t2 = memo(() => {
          order += "t2";
          return s1();
        });
        memo(() => {
          t1();
          t2();
          order += "c1";
        });
        order = "";
        s1(false);
        expect(order).toBe("t1t2c1");
      });
    });

    it("does not evaluate dependencies with tracking sources that have not changed", () => {
      inScope(() => {
        const s1 = signal(1);
        let order = "";
        let c2!: () => boolean;
        memo(() => {
          order += "c1";
          if (s1() > 1) c2();
        });
        const t1 = memo(() => {
          order += "t1";
          return s1() < 3;
        });
        const t2 = memo(() => {
          order += "t2";
          return t1();
        });
        c2 = memo(() => {
          order += "c2";
          return t2();
        });
        order = "";
        s1(2);
        expect(order).toBe("c1t1");
        order = "";
        s1(3);
        expect(order).toBe("c1t1t2c2");
      });
    });

    it("correctly marks downstream computations as stale on change", () => {
      inScope(() => {
        const s1 = signal(1);
        let order = "";
        const t1 = memo(() => {
          order += "t1";
          return s1();
        });
        const c1 = memo(() => {
          order += "c1";
          return t1();
        });
        const c2 = memo(() => {
          order += "c2";
          return c1();
        });
        memo(() => {
          order += "c3";
          return c2();
        });
        order = "";
        s1(2);
        expect(order).toBe("t1c1c2c3");
      });
    });
  });

});

describe("dormant computed chains", () => {
  // After dispose, nothing in the scope runs again.

  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }

  function setup() {
    const runs = { X: 0, Y: 0, m1: 0 };
    const read = signal(true);
    const tick = signal(0);
    let m1!: () => number;
    const dispose = effectScope(() => {
      applyEffect(tick, () => void runs.X++);
      m1 = computed(() => (runs.m1++, tick() * 2));
      applyEffect(
        () => (read() ? m1() : -1),
        () => {},
      );
      applyEffect(tick, () => void runs.Y++);
    });
    return { runs, m1, setRead: read, setTick: tick, dispose };
  }

  it("a computed that loses and regains its reader twice still dies with its scope's effects", () => {
    const { runs, setRead, setTick, dispose } = setup();
    setRead(false);
    setRead(true);
    setRead(false);

    const x = runs.X;
    const y = runs.Y;
    dispose();
    setTick(1);
    setTick(2);
    expect(runs.X).toBe(x);
    expect(runs.Y).toBe(y);
  });

  it("reading a computed after its scope is disposed doesn't revive the scope's effects", () => {
    const { runs, m1, setRead, setTick, dispose } = setup();
    setRead(false);
    dispose();
    const x = runs.X;
    const y = runs.Y;
    m1();
    setTick(1);
    m1();
    expect(runs.X).toBe(x);
    expect(runs.Y).toBe(y);
  });

  it("a computed whose child reads a lazy computed in cleanup still disposes every child", () => {
    const tick = signal(0);
    let gen = 0;
    const cleaned: string[] = [];
    const dispose = effectScope(() => {
      const held = computed(() => {
        tick();
        const g = ++gen;
        applyEffect(
          () => {
            onCleanup(() => cleaned.push("sibling" + g));
          },
          () => {},
        );
        const lazy = computed(() => g);
        applyEffect(
          () => {
            lazy();
            onCleanup(() => lazy());
          },
          () => {},
        );
        return g;
      });
      applyEffect(held, () => {});
    });
    expect(cleaned).toEqual([]);
    tick(1);
    expect(cleaned).toEqual(["sibling1"]);
    dispose();
    expect(cleaned).toEqual(["sibling1", "sibling2"]);
  });
});

describe("computed that writes its own dep", () => {
  it("re-evaluates when its getter writes a dep it read", () => {
    const s = signal(0);
    const t = signal("later-read");
    let runs = 0;
    const c = computed(() => {
      runs++;
      const v = s();
      void t();
      if (v === 0) s(1);
      return v;
    });
    // The next read must not be stale.
    c();
    expect(c()).toBe(1);
    expect(runs).toBe(2);
  });

  it("a same-value write in the getter doesn't re-evaluate", () => {
    const s = signal(0);
    let runs = 0;
    const c = computed(() => {
      runs++;
      const v = s();
      s(v);
      return v;
    });
    c();
    expect(runs).toBe(1);
    expect(c()).toBe(0);
    expect(runs).toBe(1);
  });
});

describe("a computed disposing its own scope mid-evaluation", () => {
  // "Stays disposed": a later write doesn't re-run it.

  /** An effect whose apply step runs untracked. */
  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }

  /** effectScope whose body receives its own dispose. */
  function root(fn: (dispose: () => void) => void): () => void {
    let dispose!: () => void;
    let early = false;
    dispose = effectScope(() =>
      fn(() => (dispose ? dispose() : (early = true))),
    );
    if (early) dispose();
    return dispose;
  }

  it("stays disposed: later writes don't re-run it", () => {
    const n = signal(0);
    let runs = 0;
    root((dispose) => {
      const memo = computed(() => {
        runs++;
        if (n() === 1) dispose();
        return n();
      });
      applyEffect(memo, () => {});
    });
    expect(runs).toBe(1);
    n(1);
    expect(runs).toBe(2);
    n(2);
    expect(runs).toBe(2);
  });

  it("an effect that disposes its own scope mid-run stays disposed", () => {
    const n = signal(0);
    const seen: number[] = [];
    let computes = 0;
    root((dispose) => {
      effect(() => {
        computes++;
        if (n() === 1) dispose();
        // read after dispose: must not re-link the dead effect
        const v = n();
        if (v !== 1) untracked(() => seen.push(v));
      });
    });
    expect(seen).toEqual([0]);
    expect(computes).toBe(1);
    n(1);
    expect(computes).toBe(2);
    expect(seen).toEqual([0]);
    n(2);
    expect(computes).toBe(2);
    expect(seen).toEqual([0]);
  });

  it("a computed disposing a parent scope stays disposed; the outer scope survives", () => {
    const n = signal(0);
    let sibling!: () => number;
    let runs = 0;
    let siblingRuns = 0;
    root(() => {
      const disposeOwner = root((dispose) => {
        const memo = computed(() => {
          runs++;
          if (n() === 1) dispose();
          return n();
        });
        applyEffect(memo, () => {});
      });
      void disposeOwner;
      sibling = computed(() => {
        siblingRuns++;
        return n() * 10;
      });
      applyEffect(sibling, () => {});
    });
    expect(runs).toBe(1);
    expect(siblingRuns).toBe(1);
    n(1);
    expect(runs).toBe(2);
    expect(siblingRuns).toBe(2);
    n(2);
    expect(runs).toBe(2);
    expect(siblingRuns).toBe(3);
    expect(sibling()).toBe(20);
  });

  it("disposing after the flush stops re-evaluation", () => {
    const n = signal(0);
    let memo!: () => number;
    let runs = 0;
    const dispose = root(() => {
      memo = computed(() => {
        runs++;
        return n();
      });
      applyEffect(memo, () => {});
    });
    n(1);
    expect(runs).toBe(2);
    expect(memo()).toBe(1);
    dispose();
    n(2);
    expect(runs).toBe(2);
  });
});

describe("children recreated on each evaluation", () => {
  // A computed creating an effect, then a lazy computed, per evaluation.

  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }

  function setup() {
    const state = { effectRuns: 0, lazyRuns: 0 };
    const n = signal(0);
    const p = signal(true);
    const dispose = effectScope(() => {
      let lz: (() => boolean) | undefined;
      const ownerMemo = computed(() => {
        applyEffect(
          () => {
            state.effectRuns++;
            return p() && lz ? lz() : false;
          },
          () => {},
        );
        lz = computed(() => (state.lazyRuns++, n() > 0));
        return p();
      });
      applyEffect(ownerMemo, () => {});
    });
    return { state, setN: n, setP: p, dispose };
  }

  function round(
    setN: (v: number) => void,
    setP: (v: boolean) => void,
    times: number,
  ) {
    for (let i = 1; i <= times; i++) {
      setP(false);
      setN(i % 2);
      setP(true);
    }
  }

  it("per-round cost stays constant; nothing runs after dispose", () => {
    const { state, setN, setP, dispose } = setup();
    round(setN, setP, 1);
    const e0 = state.effectRuns;
    const l0 = state.lazyRuns;
    round(setN, setP, 1);
    const perRoundEffects = state.effectRuns - e0;
    const perRoundLazy = state.lazyRuns - l0;
    for (let i = 0; i < 20; i++) {
      const e = state.effectRuns;
      const l = state.lazyRuns;
      round(setN, setP, 1);
      // no orphan accumulates: cost per round stays constant
      expect(state.effectRuns - e).toBe(perRoundEffects);
      expect(state.lazyRuns - l).toBe(perRoundLazy);
    }
    dispose();
    const runs = state.effectRuns;
    const lazy = state.lazyRuns;
    round(setN, setP, 2);
    expect(state.effectRuns).toBe(runs);
    expect(state.lazyRuns).toBe(lazy);
  });
});

describe("child computed recreated on each evaluation", () => {
  // `condition` coerces to boolean to cut off unchanged values.

  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }

  function setup() {
    const state = { innerRuns: 0 };
    const n = signal(0);
    const dispose = effectScope(() => {
      const conditionValue = computed(() => {
        const inner = computed(() => {
          state.innerRuns++;
          return n() > 0;
        });
        return inner() && n() < 2;
      });
      const condition = computed(() => !!conditionValue());
      const show = computed(() => (condition() ? "Visible" : undefined));
      applyEffect(show, () => {});
    });
    return { state, setN: n, dispose };
  }

  function alternate(setN: (v: number) => void, times: number) {
    for (let i = 1; i <= times; i++) setN(i % 2);
  }

  it("child runs per round stay bounded; nothing runs after dispose", () => {
    const { state, setN, dispose } = setup();
    const runsBefore = state.innerRuns;
    alternate(setN, 40);
    const controlRuns = state.innerRuns - runsBefore;

    const before = state.innerRuns;
    alternate(setN, 40);
    expect(state.innerRuns - before).toBe(controlRuns);

    dispose();
    const after = state.innerRuns;
    alternate(setN, 40);
    expect(state.innerRuns).toBe(after);
  });
});

describe("owner that recreates a child", () => {
  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }

  function alternate(setN: (v: number) => void, times: number) {
    for (let i = 1; i <= times; i++) setN(i % 2);
  }

  it("runs once per write, with constant child cost; nothing runs after dispose", () => {
    const state = { ownerRuns: 0, childCreations: 0, childRuns: 0 };
    const n = signal(0);
    const dispose = effectScope(() => {
      const conditionValue = computed(() => {
        state.ownerRuns++;
        state.childCreations++;
        const inner = computed(() => {
          state.childRuns++;
          return n() > 0;
        });
        return inner() && n() < 2;
      });
      const condition = computed(() => !!conditionValue());
      const show = computed(() => (condition() ? "Visible" : undefined));
      applyEffect(show, () => {});
    });

    const base = { ...state };
    alternate(n, 40);
    expect(state.ownerRuns - base.ownerRuns).toBe(40);
    expect(state.childCreations - base.childCreations).toBe(40);
    const controlChildRuns = state.childRuns - base.childRuns;

    // steady state: the same cost again (no leaked child re-running)
    const again = { ...state };
    alternate(n, 40);
    expect(state.ownerRuns - again.ownerRuns).toBe(40);
    expect(state.childCreations - again.childCreations).toBe(40);
    expect(state.childRuns - again.childRuns).toBe(controlChildRuns);

    dispose();
    const after = { ...state };
    alternate(n, 40);
    expect(state).toEqual(after);
  });
});

describe("unobserved computeds", () => {
  function setup() {
    let runs = 0;
    const g = signal(0);
    const m = computed(() => {
      runs++;
      return g() + 1;
    });
    m();
    let n = 0;
    return { m, write: () => g(++n), runs: () => runs };
  }

  it("m(); untracked(m); write — recomputes once per write", () => {
    const { m, write, runs } = setup();
    expect(runs()).toBe(1);
    for (let i = 2; i <= 5; i++) {
      m();
      untracked(m);
      write();
      m();
      expect(runs()).toBe(i);
    }
  });

  it("untracked(m); m(); write — recomputes once per write", () => {
    const { m, write, runs } = setup();
    expect(runs()).toBe(1);
    for (let i = 2; i <= 5; i++) {
      untracked(m);
      m();
      write();
      untracked(m);
      expect(runs()).toBe(i);
    }
  });

  it("both read orders cost the same", () => {
    const a = setup();
    const b = setup();
    for (let i = 0; i < 4; i++) {
      a.m();
      untracked(a.m);
      a.write();
      untracked(b.m);
      b.m();
      b.write();
      expect(a.runs()).toBe(b.runs());
    }
    a.m();
    b.m();
    expect(a.runs()).toBe(5);
    expect(b.runs()).toBe(5);
  });
});

describe("computeds created inside untracked", () => {
  it("a computed created lazily inside untracked() still tracks its deps", () => {
    let runs = 0;
    const g = signal(0);
    let memo: (() => number) | undefined;
    // Created on first read.
    const m = () =>
      (memo ??= computed(() => {
        runs++;
        return g() + 1;
      }))();

    expect(untracked(m)).toBe(1);
    expect(runs).toBe(1);

    g(1);
    expect(untracked(m)).toBe(2);
    expect(runs).toBe(2);

    g(5);
    expect(untracked(m)).toBe(6);
    expect(runs).toBe(3);
  });

  it("a computed created directly inside untracked(fn) tracks its deps", () => {
    const g = signal(1);
    let runs = 0;
    let memo!: () => number;
    const first = untracked(() => {
      memo = computed(() => {
        runs++;
        return g() * 10;
      });
      return memo();
    });
    expect(first).toBe(10);
    expect(runs).toBe(1);

    g(2);
    expect(memo()).toBe(20);
    expect(runs).toBe(2);
  });

  it("a computed created and read inside untracked() in an effect still notifies a later reader", () => {
    const g = signal(1);
    let memo!: () => number;
    const log: number[] = [];
    const stop = effectScope(() => {
      effect(() => {
        untracked(() => {
          memo = computed(() => g() * 10);
          memo();
        });
      });
      effect(() => log.push(memo()));
    });
    g(2);
    expect(log).toEqual([10, 20]);
    stop();
  });
});

describe("plain writes and computed reads", () => {
  it("untracked reads don't change what m() returns", () => {
    const count = signal(0);
    const m = computed(() => count() * 2);
    m();
    count(4);
    expect(untracked(m)).toBe(8);
    expect(m()).toBe(8);
    expect(untracked(m)).toBe(8);
    expect(m()).toBe(8);
  });

  it("notifies effects after untracked reads", () => {
    const count = signal(0);
    const m = computed(() => count() * 2);
    const effectLog: number[] = [];
    const stop = effectScope(() => {
      effect(() => {
        const v = m();
        untracked(() => effectLog.push(v));
      });
    });
    expect(effectLog).toEqual([0]);

    count(4);
    expect(untracked(m)).toBe(8);
    expect(m()).toBe(8);
    expect(effectLog).toEqual([0, 8]);

    count(10);
    expect(m()).toBe(20);
    expect(effectLog).toEqual([0, 8, 20]);
    stop();
  });

  it("chained computeds stay consistent under untracked reads", () => {
    const count = signal(1);
    const m = computed(() => count() * 2);
    const m2 = computed(() => m() + 1);
    expect(m2()).toBe(3);

    count(5);
    expect(untracked(m2)).toBe(11);
    expect(m()).toBe(10);
    expect(m2()).toBe(11);
  });
});
