import { describe, expect, it, vi } from "vitest";
import {
  batch,
  computed,
  effect,
  effectScope,
  onCleanup,
  signal,
  untracked,
} from "./lib";
import { scope } from "./scope";
import type { Signal } from "./index";

describe("effects with a separate apply step", () => {
  // applyEffect(compute, apply): `apply` runs untracked and may return a
  // cleanup. root(fn): effectScope whose body gets its own dispose.

  type Cleanup = void | (() => void);

  function applyEffect<T>(
    compute: () => T,
    apply: (v: T, prev: T | undefined) => Cleanup,
  ) {
    let prev: T | undefined;
    return effect(() => {
      const v = compute();
      untracked(() => {
        const c = apply(v, prev);
        prev = v;
        if (typeof c === "function") onCleanup(c);
      });
    });
  }

  function root<T>(fn: (dispose: () => void) => T): T {
    let stop: (() => void) | undefined;
    let disposed = false;
    const dispose = () => {
      if (stop) stop();
      else disposed = true;
    };
    let result!: T;
    stop = effectScope(() => {
      result = fn(dispose);
    });
    if (disposed) stop();
    return result;
  }

  it("should run effect", () => {
    const x = signal(0),
      compute = vi.fn(() => x()),
      eff = vi.fn();

    root(() => applyEffect(compute, eff));
    expect(compute).toHaveBeenCalledTimes(1);
    expect(eff).toHaveBeenCalledTimes(1);
    expect(eff).toHaveBeenCalledWith(0, undefined);

    x(1);
    expect(compute).toHaveBeenCalledTimes(2);
    expect(eff).toHaveBeenCalledTimes(2);
    expect(eff).toHaveBeenCalledWith(1, 0);
  });

  it("should run effect on change", () => {
    const eff = vi.fn();
    const x = signal(10);
    const y = signal(10);
    const a = computed(() => x() + y());
    const b = computed(() => a());

    root(() => applyEffect(b, eff));
    expect(eff).toHaveBeenCalledTimes(1);

    x(20);
    expect(eff).toHaveBeenCalledTimes(2);

    y(20);
    expect(eff).toHaveBeenCalledTimes(3);

    x(20);
    y(20);
    expect(eff).toHaveBeenCalledTimes(3);
  });

  it("should handle nested effect", () => {
    const x = signal(0);
    const y = signal(0);

    const outerEffect = vi.fn();
    const innerEffect = vi.fn();
    const innerPureDispose = vi.fn();
    const innerEffectDispose = vi.fn();

    const stopEffect = root((dispose) => {
      applyEffect(() => {
        x();
        applyEffect(
          () => {
            y();
            onCleanup(innerPureDispose);
          },
          () => {
            innerEffect();
            return () => {
              innerEffectDispose();
            };
          },
        );
      }, outerEffect);
      return dispose;
    });

    expect(outerEffect).toHaveBeenCalledTimes(1);
    expect(innerEffect).toHaveBeenCalledTimes(1);
    expect(innerPureDispose).toHaveBeenCalledTimes(0);
    expect(innerEffectDispose).toHaveBeenCalledTimes(0);

    y(1);
    expect(outerEffect).toHaveBeenCalledTimes(1);
    expect(innerEffect).toHaveBeenCalledTimes(2);
    expect(innerPureDispose).toHaveBeenCalledTimes(1);
    expect(innerEffectDispose).toHaveBeenCalledTimes(1);

    y(2);
    expect(outerEffect).toHaveBeenCalledTimes(1);
    expect(innerEffect).toHaveBeenCalledTimes(3);
    expect(innerPureDispose).toHaveBeenCalledTimes(2);
    expect(innerEffectDispose).toHaveBeenCalledTimes(2);

    innerEffect.mockReset();
    innerPureDispose.mockReset();
    innerEffectDispose.mockReset();

    x(1);
    expect(outerEffect).toHaveBeenCalledTimes(2);
    expect(innerEffect).toHaveBeenCalledTimes(1); // new one is created
    expect(innerPureDispose).toHaveBeenCalledTimes(1);
    expect(innerEffectDispose).toHaveBeenCalledTimes(1);

    y(3);
    expect(outerEffect).toHaveBeenCalledTimes(2);
    expect(innerEffect).toHaveBeenCalledTimes(2);
    expect(innerPureDispose).toHaveBeenCalledTimes(2);
    expect(innerEffectDispose).toHaveBeenCalledTimes(2);

    stopEffect();
    x(10);
    y(10);
    expect(outerEffect).toHaveBeenCalledTimes(2);
    expect(innerEffect).toHaveBeenCalledTimes(2);
    expect(innerPureDispose).toHaveBeenCalledTimes(3);
    expect(innerEffectDispose).toHaveBeenCalledTimes(3);
  });

  it("should stop effect", () => {
    const eff = vi.fn();
    const x = signal(10);

    const stopEffect = root((dispose) => {
      applyEffect(x, eff);
      return dispose;
    });
    eff.mockReset(); // the first run already happened

    stopEffect();
    x(20);
    expect(eff).toHaveBeenCalledTimes(0);
  });

  it("should run all disposals before each new run", () => {
    const eff = vi.fn();
    const disposeA = vi.fn();
    const disposeB = vi.fn();
    const disposeC = vi.fn();

    function fnA() {
      onCleanup(disposeA);
    }
    function fnB() {
      onCleanup(disposeB);
    }

    const x = signal(0);

    root(() =>
      applyEffect(
        () => {
          (fnA(), fnB());
          return x();
        },
        () => {
          eff();
          return disposeC;
        },
      ),
    );

    expect(eff).toHaveBeenCalledTimes(1);
    expect(disposeA).toHaveBeenCalledTimes(0);
    expect(disposeB).toHaveBeenCalledTimes(0);
    expect(disposeC).toHaveBeenCalledTimes(0);

    for (let i = 1; i <= 3; i += 1) {
      x(i);
      expect(eff).toHaveBeenCalledTimes(i + 1);
      expect(disposeA).toHaveBeenCalledTimes(i);
      expect(disposeB).toHaveBeenCalledTimes(i);
      expect(disposeC).toHaveBeenCalledTimes(i);
    }
  });

  it("should dispose of nested effect", () => {
    const x = signal(0);
    const innerEffect = vi.fn();

    const stopEffect = root((dispose) => {
      applyEffect(
        () => {
          applyEffect(x, innerEffect);
        },
        () => {},
      );
      return dispose;
    });

    stopEffect();
    innerEffect.mockReset(); // the first run already happened

    x(10);
    expect(innerEffect).toHaveBeenCalledTimes(0);
    expect(innerEffect).not.toHaveBeenCalledWith(10);
  });

  it("should conditionally observe", () => {
    const x = signal(0);
    const y = signal(0);
    const condition = signal(true);

    const a = computed(() => (condition() ? x() : y()));
    const eff = vi.fn();

    root(() => applyEffect(a, eff));
    expect(eff).toHaveBeenCalledTimes(1);

    y(1);
    expect(eff).toHaveBeenCalledTimes(1);

    x(1);
    expect(eff).toHaveBeenCalledTimes(2);

    condition(false);
    expect(eff).toHaveBeenCalledTimes(2);

    y(2);
    expect(eff).toHaveBeenCalledTimes(3);

    x(3);
    expect(eff).toHaveBeenCalledTimes(3);
  });

  it("should dispose of nested conditional effect", () => {
    const condition = signal(true);
    const disposeA = vi.fn();
    const disposeB = vi.fn();

    function fnA() {
      applyEffect(
        () => {
          onCleanup(disposeA);
        },
        () => {},
      );
    }
    function fnB() {
      applyEffect(
        () => {
          onCleanup(disposeB);
        },
        () => {},
      );
    }

    root(() =>
      applyEffect(
        () => (condition() ? fnA() : fnB()),
        () => {},
      ),
    );
    condition(false);
    expect(disposeA).toHaveBeenCalledTimes(1);
  });

  it("should handle looped effects", () => {
    let values: number[] = [],
      loop = 2;

    const value = signal(0);

    root(() =>
      applyEffect(
        () => {
          values.push(value());
          for (let i = 0; i < loop; i++) {
            applyEffect(
              () => {
                values.push(value() + i);
              },
              () => {},
            );
          }
        },
        () => {},
      ),
    );

    expect(values).toHaveLength(3);
    expect(values.join(",")).toBe("0,0,1");

    loop = 1;
    values = [];
    value(1);
    expect(values).toHaveLength(2);
    expect(values.join(",")).toBe("1,1");

    values = [];
    value(2);
    expect(values).toHaveLength(2);
    expect(values.join(",")).toBe("2,2");
  });

  it("should apply changes in effect in same flush", () => {
    const x = signal(0),
      y = signal(0);

    const a = computed(() => x() + 1),
      b = computed(() => a() + 2);

    root(() =>
      applyEffect(y, () => {
        x(untracked(x) + 1);
      }),
    );

    expect(x()).toBe(1);
    expect(b()).toBe(4);
    expect(a()).toBe(2);

    y(1);
    expect(x()).toBe(2);
    expect(b()).toBe(5);
    expect(a()).toBe(3);

    y(2);
    expect(x()).toBe(3);
    expect(b()).toBe(6);
    expect(a()).toBe(4);
  });

  it("should run parent effect before child effect", () => {
    const x = signal(0);
    const condition = computed(() => x());

    let calls = 0;

    root(() =>
      applyEffect(
        () => {
          applyEffect(
            () => {
              x();
              calls++;
            },
            () => {},
          );
          condition();
        },
        () => {},
      ),
    );

    calls = 0;
    x(1);
    // Parent re-runs, disposes the old child, creates a new one: one child run.
    expect(calls).toBe(1);
  });

  describe("a cleanup returned from the apply step", () => {
    it("runs once at disposal, after per-rerun cleanups", () => {
      const x = signal(0);
      const cleanup = vi.fn();

      const dispose = root((dispose) => {
        applyEffect(x, () => cleanup);
        return dispose;
      });
      expect(cleanup).toHaveBeenCalledTimes(0);

      x(1);
      expect(cleanup).toHaveBeenCalledTimes(1);

      dispose();
      expect(cleanup).toHaveBeenCalledTimes(2);

      x(2);
      expect(cleanup).toHaveBeenCalledTimes(2);
    });

    it("on dispose, children clean up in reverse order, then the scope's own cleanups in registration order", () => {
      const order: string[] = [];
      const x = signal(0);

      const dispose = root((dispose) => {
        onCleanup(() => order.push("onCleanup:before"));
        applyEffect(x, () => () => order.push("effect:A"));
        applyEffect(x, () => () => order.push("effect:B"));
        onCleanup(() => order.push("onCleanup:after"));
        return dispose;
      });
      dispose();
      expect(order).toEqual([
        "effect:B",
        "effect:A",
        "onCleanup:before",
        "onCleanup:after",
      ]);
    });

    it("early individual disposal fires the cleanup once; outer disposal does not re-run it", () => {
      const x = signal(0);
      const cleanup = vi.fn();

      let disposeInner!: () => void;
      const disposeOuter = root((dispose) => {
        root((d) => {
          disposeInner = d;
          applyEffect(x, () => cleanup);
        });
        return dispose;
      });

      disposeInner();
      expect(cleanup).toHaveBeenCalledTimes(1);

      disposeOuter();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

  });
});

describe("plain effects", () => {
  // applyEffect(compute, apply): `apply` runs untracked.
  // update(s, fn): read-then-write.

  function root<T>(fn: (dispose: () => void) => T): T {
    let stop: (() => void) | undefined;
    const dispose = () => stop?.();
    let result!: T;
    stop = effectScope(() => {
      result = fn(dispose);
    });
    return result;
  }

  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }

  const update = <T>(s: Signal<T>, fn: (p: T) => T) =>
    s(fn(untracked(() => s())));

  it("a write inside an effect applies on every run", () => {
    const trig = signal(0);
    const target = signal(0);

    root(() =>
      effect(() => {
        trig();
        update(target, (n) => n + 1);
      }),
    );

    expect(target()).toBe(1);

    trig(1);
    expect(target()).toBe(2);
  });

  it("should work with dynamic conditional tracking", () => {
    const type = signal<"a" | "b">("a");
    const valueA = signal("Alice");
    const valueB = signal("Bob");
    const log = vi.fn();

    root(() => {
      effect(() => {
        if (type() === "a") log(valueA());
        else log(valueB());
      });
    });

    expect(log).toHaveBeenCalledWith("Alice");
    expect(log).toHaveBeenCalledTimes(1);

    valueB("Bobby");
    expect(log).toHaveBeenCalledTimes(1);

    type("b");
    expect(log).toHaveBeenCalledWith("Bobby");
    expect(log).toHaveBeenCalledTimes(2);

    valueA("Alicia");
    expect(log).toHaveBeenCalledTimes(2);

    valueB("Robert");
    expect(log).toHaveBeenCalledWith("Robert");
    expect(log).toHaveBeenCalledTimes(3);
  });

  describe("writes from another effect", () => {
    it("a reader re-runs once after another effect's write", () => {
      const s = signal(0);
      const trig = signal(0);
      const seen: number[] = [];
      root(() => {
        effect(() => {
          seen.push(s());
        });
        applyEffect(
          () => trig(),
          (t) => {
            if (t) s(t);
          },
        );
      });
      expect(seen).toEqual([0]);
      trig(1);
      expect(s()).toBe(1);
      expect(seen).toEqual([0, 1]);
    });

    it("a computed changed in another effect's apply step wakes its reader", () => {
      const src = signal(0);
      const trig = signal(0);
      const m = computed(() => src() * 10);
      const seen: number[] = [];
      root(() => {
        effect(() => {
          seen.push(m());
        });
        applyEffect(
          () => trig(),
          (t) => {
            if (t) src(t);
          },
        );
      });
      trig(1);
      expect(m()).toBe(10);
      expect(seen).toEqual([0, 10]);
    });

    it("an effect created in another effect's apply step sees that step's earlier write", () => {
      const s = signal(0);
      const seen: number[] = [];
      root(() => {
        applyEffect(
          () => 0,
          () => {
            s(1);
            effect(() => {
              seen.push(s());
            });
          },
        );
      });
      expect(seen).toEqual([1]);
    });

    it("no extra run when the effect already saw the value", () => {
      const s = signal(0);
      const runs = vi.fn(() => {
        s();
      });
      root(() => effect(runs));
      s(1);
      expect(runs).toHaveBeenCalledTimes(2);
    });

    it("an effect created after a writer sees the write on its first run", () => {
      const s = signal(0);
      const seen: number[] = [];
      root(() => {
        applyEffect(
          () => 1,
          () => {
            s(1);
          },
        );
        effect(() => {
          seen.push(s());
        });
      });
      expect(s()).toBe(1);
      expect(seen).toEqual([1]);
    });
  });
});

describe("writes inside effects", () => {
  // lastEffect(fn): an untracked effect created last in its scope.

  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }
  const lastEffect = (fn: () => void) => effect(() => untracked(fn));
  const update = <T>(s: Signal<T>, fn: (p: T) => T) =>
    s(fn(untracked(() => s())));

  it("an effect reads a computed derived from its own write at the new value", () => {
    const reads: number[] = [];
    const memoValues: number[] = [];
    effectScope(() => {
      const count = signal(0);
      const doubled = computed(() => count() * 2);
      applyEffect(doubled, (v) => {
        memoValues.push(v);
      });
      lastEffect(() => {
        count(1);
        reads.push(doubled());
      });
    });
    expect(reads).toEqual([2]);
    expect(memoValues).toEqual([0, 2]);
  });

  it("an effect sees writes made by effects created before it", () => {
    const reads: number[] = [];
    effectScope(() => {
      const a = signal(0);
      const x = signal(0);
      applyEffect(a, () => {
        x(1);
      });
      lastEffect(() => {
        reads.push(x());
      });
    });
    expect(reads).toEqual([1]);
  });
});

describe("disposal during a flush", () => {
  // chain(src, n): n computeds in a row. root(fn): effectScope whose body
  // gets its own dispose.

  function chain<T>(src: () => T, n: number): () => T {
    let cur = src;
    for (let i = 0; i < n; i++) {
      const prev = cur;
      cur = computed(() => prev());
    }
    return cur;
  }

  function root(fn: (dispose: () => void) => void): () => void {
    let stop: (() => void) | undefined;
    const dispose = () => stop?.();
    stop = effectScope(() => fn(dispose));
    return dispose;
  }
  it("disposing a deep subtree mid-update keeps later updates correct", () => {
    const open = signal(true);
    let setRows!: (v: number[] | null) => void;
    let view: () => unknown = () => null;

    const dispose = root(() => {
      const gate = chain(() => open(), 4);
      const appView = computed(() => {
        if (!gate()) return null;
        const rows = signal<number[] | null>(null);
        setRows = rows;
        const tall = chain(
          computed(() => 1),
          12,
        );
        const deepA = chain(
          computed(() => 1),
          20,
        );
        const deepB = chain(() => rows(), 45);
        let expr: (() => unknown) | undefined;
        const conditionValue = computed(() => {
          tall();
          expr ??= computed(
            () => (rows() === null ? deepA() : deepB()) && true,
          );
          return expr();
        });
        const condition = computed(() => !!conditionValue());
        const value = computed(() => (condition() ? "inner ready" : null));
        return value();
      });
      view = appView;
      effect(() => {
        appView();
      });
    });

    expect(view()).toBe("inner ready");
    setRows([1, 2, 3]);
    open(false);
    expect(view()).toBe(null);
    open(true);
    setRows([1, 2, 3]);
    expect(view()).toBe("inner ready");
    dispose();
  });

  it("an effect disposing its own scope doesn't skip a sibling scope's effect", () => {
    const effects: string[] = [];
    const go = signal(false);
    const disposers: (() => void)[] = [];
    try {
      disposers.push(
        root((dispose) => {
          effect(() => {
            if (!go()) return;
            effects.push("first");
            dispose();
          });
        }),
      );
      disposers.push(
        root(() => {
          effect(() => {
            if (!go()) return;
            effects.push("second");
          });
        }),
      );
      go(true);
      expect(effects).toEqual(["first", "second"]);
      go(false);
      go(true);
      expect(effects).toEqual(["first", "second", "second"]);
    } finally {
      for (const d of disposers) d();
    }
  });

  it("disposing a scope that owns two scopes doesn't skip a later sibling", () => {
    const effects: string[] = [];
    const go = signal(false);
    const disposers: (() => void)[] = [];
    const scopeWithEffect = (label: string, body?: () => void) =>
      effectScope(() => {
        effect(() => {
          if (!go()) return;
          effects.push(label);
          body?.();
        });
      });
    try {
      disposers.push(
        root((dispose) => {
          scopeWithEffect("a1");
          scopeWithEffect("a2", () => dispose());
        }),
      );
      disposers.push(
        root(() => {
          scopeWithEffect("b");
        }),
      );
      go(true);
      expect(effects).toEqual(["a1", "a2", "b"]);
    } finally {
      for (const d of disposers) d();
    }
  });
});

describe("writes inside scopes", () => {
  const make = () => {
    const s = signal(0);
    return () => s(1);
  };

  it("a write outside any scope works", () => {
    const write = make();
    expect(write).not.toThrow();
  });

  it("a write in an effectScope body works", () => {
    const write = make();
    expect(() => effectScope(write)).not.toThrow();
  });

  it("a write in a scope created inside a computed works", () => {
    const write = make();
    const c = computed(() => {
      effectScope(write);
      return 1;
    });
    expect(c()).toBe(1);
  });

  it("a write in a computed body works", () => {
    const write = make();
    const c = computed(() => {
      write();
      return 1;
    });
    expect(c()).toBe(1);
  });

  it("an untracked write inside an effect works", () => {
    const write = make();
    const tick = signal(0);
    effectScope(() => {
      effect(() => {
        tick();
        untracked(write);
      });
    });
    expect(() => tick(1)).not.toThrow();
  });

  it("a tracked write inside an effect works", () => {
    const write = make();
    const tick = signal(0);
    effectScope(() => {
      effect(() => {
        tick();
        write();
      });
    });
    expect(() => tick(1)).not.toThrow();
  });
});

describe("first pass after mount", () => {
  // `when` gates content created untracked inside a computed. The slot must
  // never show beside a stale `x`.

  function mountUnderWhen(contentInComputed: boolean) {
    const x = signal(0);
    let screenX: unknown;
    let slot: unknown;
    const pairs: unknown[] = [];
    const [, dispose] = scope(() => {
      effect(() => {
        screenX = x();
      });
      const when = computed(() => x() > 0);
      const children = computed<unknown>(() =>
        when()
          ? untracked(() =>
              contentInComputed
                ? computed(() => `content ${x()}`)
                : () => `content ${x()}`,
            )
          : "closed",
      );
      effect(() => {
        const c = children();
        slot = typeof c === "function" ? (c as () => unknown)() : c;
        pairs.push([untracked(x), slot]);
      });
    });
    const screens: unknown[] = [[screenX, slot]];
    x(1);
    screens.push([screenX, slot]);
    x(2);
    screens.push([screenX, slot]);
    dispose();
    return { screens, pairs };
  }

  it("mounted content shows the value that opened it", () => {
    const { screens, pairs } = mountUnderWhen(false);
    expect(screens).toEqual([
      [0, "closed"],
      [1, "content 1"],
      [2, "content 2"],
    ]);
    // Every slot render is coherent with x at the time.
    for (const [v, s] of pairs as [number, string][])
      if (v > 0) expect(s).toBe(`content ${v}`);
  });

  it("same with the content in a computed", () => {
    const { screens, pairs } = mountUnderWhen(true);
    expect(screens).toEqual([
      [0, "closed"],
      [1, "content 1"],
      [2, "content 2"],
    ]);
    for (const [v, s] of pairs as [number, string][])
      if (v > 0) expect(s).toBe(`content ${v}`);
  });
});

describe("own writes: scenarios", () => {
  describe("write sources", () => {
    it("direct self-write, then external revert re-runs", () => {
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        if (s() === "idle") s("pending");
      });
      // Runs once more to see its own write.
      expect(runs).toBe(2);
      s("idle");
      expect(runs).toBe(4);
      expect(s()).toBe("pending");
    });

    it("untracked self-write, then external revert re-runs", () => {
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        if (s() !== "idle") return;
        untracked(() => s("pending"));
      });
      expect(runs).toBe(2);
      s("idle");
      expect(runs).toBe(4);
    });

    it("a child effect's write re-runs the parent, which then sees it", () => {
      const s = signal("idle");
      let runs = 0;
      let childRuns = 0;
      effect(() => {
        runs++;
        if (s() !== "idle") return;
        effect(() => {
          childRuns++;
          s("pending");
        });
      });
      // The child's write re-runs the parent, which
      // sees "pending" (disposing the child).
      expect([runs, childRuns]).toEqual([2, 1]);
      s("idle");
      expect([runs, childRuns]).toEqual([4, 2]);
      s("idle");
      expect([runs, childRuns]).toEqual([6, 3]);
    });

    it("a detached effect created inside the run: its write re-runs the creator", () => {
      const s = signal("idle");
      const stops: (() => void)[] = [];
      let runs = 0;
      effect(() => {
        runs++;
        if (s() !== "idle") return;
        untracked(() => stops.push(effect(() => s("pending"))));
      });
      expect(runs).toBe(2);
      s("idle");
      expect(runs).toBe(4);
      expect(stops).toHaveLength(2);
      for (const stop of stops) stop();
    });

    it("self-write through a computed dep re-runs once to see the new value", () => {
      const s = signal("idle");
      const c = computed(() => s());
      const seen: string[] = [];
      effect(() => {
        seen.push(c());
        if (c() === "idle") s("pending");
      });
      expect(seen).toEqual(["idle", "pending"]);
      s("idle");
      expect(seen).toEqual(["idle", "pending", "idle", "pending"]);
      expect(c()).toBe("pending");
    });

    it("self-write to a signal read only through a chain of computeds", () => {
      const s = signal(0);
      const c1 = computed(() => s() * 10);
      const c2 = computed(() => c1() + 1);
      const seen: number[] = [];
      effect(() => {
        seen.push(c2());
        if (s() === 0) untracked(() => s(1));
      });
      expect(seen).toEqual([1, 11]);
      s(0);
      expect(seen).toEqual([1, 11, 1, 11]);
      expect(c2()).toBe(11);
      s(2);
      expect(seen).toEqual([1, 11, 1, 11, 21]);
    });

    it("self-write to several deps; reverting either one re-runs", () => {
      const a = signal("a0");
      const b = signal("b0");
      let runs = 0;
      effect(() => {
        runs++;
        if (a() === "a0") a("a1");
        if (b() === "b0") b("b1");
      });
      expect(runs).toBe(2);
      b("b0");
      expect(runs).toBe(4);
      a("a0");
      expect(runs).toBe(6);
      expect([a(), b()]).toEqual(["a1", "b1"]);
    });
  });

  describe("revert cycles", () => {
    it("A→B (own write), then A (external) re-runs", () => {
      const s = signal("idle");
      const states: string[] = [];
      effect(() => {
        const v = s();
        states.push(v);
        if (v === "idle") untracked(() => s("pending"));
      });
      expect(states).toEqual(["idle", "pending"]);
      s("idle");
      expect(states).toEqual(["idle", "pending", "idle", "pending"]);
    });

    it("re-runs on each of 5 external resets to idle", () => {
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        if (s() === "idle") untracked(() => s("pending"));
      });
      for (let i = 1; i <= 5; i++) {
        s("idle");
        expect(runs).toBe(2 + 2 * i);
        expect(s()).toBe("pending");
      }
    });

    it("external write to a third value, then back to the old value", () => {
      const s = signal("idle");
      const states: string[] = [];
      effect(() => {
        const v = s();
        states.push(v);
        if (v === "idle") s("pending");
      });
      s("done");
      s("idle");
      expect(states).toEqual(["idle", "pending", "done", "idle", "pending"]);
      expect(s()).toBe("pending");
    });

    it("external write equal to the self-written value does not re-run", () => {
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        if (s() === "idle") s("pending");
      });
      expect(runs).toBe(2);
      s("pending");
      expect(runs).toBe(2);
    });
  });

  describe("batch", () => {
    it("self-write inside batch() within the run", () => {
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        if (s() === "idle") batch(() => s("pending"));
      });
      expect(runs).toBe(2);
      expect(s()).toBe("pending");
      s("idle");
      expect(runs).toBe(4);
    });

    it("external revert inside batch() re-runs once at batch end", () => {
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        if (s() === "idle") s("pending");
      });
      batch(() => {
        s("idle");
        expect(runs).toBe(2);
      });
      expect(runs).toBe(4);
    });

    it("external revert inside nested batch() flushes only at the outermost end", () => {
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        if (s() === "idle") s("pending");
      });
      batch(() => {
        batch(() => s("idle"));
        expect(runs).toBe(2);
      });
      expect(runs).toBe(4);
      batch(() => batch(() => batch(() => s("idle"))));
      expect(runs).toBe(6);
    });

    it("external A→B→A inside one batch re-runs (it last saw the written value)", () => {
      const s = signal("idle");
      const states: string[] = [];
      effect(() => {
        const v = s();
        states.push(v);
        if (v === "idle") s("pending");
      });
      batch(() => {
        s("done");
        s("idle");
      });
      expect(states).toEqual(["idle", "pending", "idle", "pending"]);
    });

    it("effect first created inside batch() still commits its self-write", () => {
      const s = signal("idle");
      let runs = 0;
      batch(() => {
        effect(() => {
          runs++;
          if (s() === "idle") s("pending");
        });
      });
      // The re-run doesn't wait for the batch.
      expect(runs).toBe(2);
      s("idle");
      expect(runs).toBe(4);
    });
  });

  describe("other subscribers", () => {
    it("a reader created before the writer sees every value exactly once", () => {
      const s = signal("idle");
      const seen: string[] = [];
      effect(() => {
        seen.push(s());
      });
      let writerRuns = 0;
      effect(() => {
        writerRuns++;
        if (s() === "idle") s("pending");
      });
      expect(seen).toEqual(["idle", "pending"]);
      s("idle");
      expect(writerRuns).toBe(4);
      expect(seen).toEqual(["idle", "pending", "idle", "pending"]);
    });

    it("a reader created after the writer only sees settled values", () => {
      const s = signal("idle");
      let writerRuns = 0;
      effect(() => {
        writerRuns++;
        if (s() === "idle") s("pending");
      });
      const seen: string[] = [];
      effect(() => {
        seen.push(s());
      });
      expect(seen).toEqual(["pending"]);
      // The writer runs first and rewrites "pending" before the reader runs,
      // so the reader runs once and sees the settled value, never "idle".
      s("idle");
      expect(writerRuns).toBe(4);
      expect(seen).toEqual(["pending", "pending"]);
      s("x");
      expect(writerRuns).toBe(5);
      expect(seen).toEqual(["pending", "pending", "x"]);
    });

    it("two writers on the same signal settle without looping", () => {
      const s = signal(0);
      let r1 = 0;
      let r2 = 0;
      effect(() => {
        r1++;
        if (s() === 0) s(1);
      });
      effect(() => {
        r2++;
        if (s() === 1) s(2);
      });
      expect(s()).toBe(2);
      for (let i = 0; i < 3; i++) {
        const [b1, b2] = [r1, r2];
        s(0);
        expect(s()).toBe(2);
        expect(r1 - b1).toBe(2);
        expect(r2 - b2).toBe(2);
      }
    });

    // w2's write re-runs w1, so w1 ends on the current value.
    it("writer observes a value written by another effect during its run", () => {
      const s = signal(0);
      const w1Seen: number[] = [];
      effect(() => {
        const v = s();
        w1Seen.push(v);
        if (v === 0) s(1);
      });
      effect(() => {
        if (s() === 1) s(2);
      });
      expect(w1Seen).toEqual([0, 1, 2]);
      s(0);
      expect(w1Seen.at(-1)).toBe(2);
      expect(s()).toBe(2);
    });

    it("effects notified by a write inside an effect run right away", () => {
      const s = signal(0);
      const log: string[] = [];
      effect(() => {
        if (s() === 1) log.push("reader");
      });
      effect(() => {
        log.push("writer:start");
        untracked(() => s(1));
        log.push("writer:end");
      });
      expect(log).toEqual(["writer:start", "reader", "writer:end"]);
    });

    it("batch() inside a running effect flushes when the batch ends", () => {
      const s = signal(0);
      const go = signal(0);
      const log: string[] = [];
      effect(() => {
        if (s() > 0) log.push("B");
      });
      effect(() => {
        if (go() === 0) return;
        log.push("A:start");
        batch(() => s(untracked(s) + 1));
        log.push("A:end");
      });
      go(1);
      expect(log).toEqual(["A:start", "B", "A:end"]);
    });
  });

  describe("computed subscribers", () => {
    it("a computed of the self-written signal reads the written value", () => {
      const s = signal(1);
      const double = computed(() => s() * 2);
      effect(() => {
        if (s() === 1) s(5);
      });
      expect(double()).toBe(10);
      s(1);
      expect(double()).toBe(10);
      s(3);
      expect(double()).toBe(6);
    });

    it("diamond: effect reads both branches and the source, writes the source", () => {
      const s = signal(0);
      const a = computed(() => s() + 1);
      const b = computed(() => s() * 2);
      const sum = computed(() => a() + b());
      const sumSeen: number[] = [];
      effect(() => {
        sumSeen.push(sum());
      });
      const writerSeen: number[] = [];
      effect(() => {
        writerSeen.push(sum());
        if (s() === 0) s(1);
      });
      expect(sum()).toBe(4);
      expect(writerSeen).toEqual([1, 4]);
      expect(sumSeen).toEqual([1, 4]);

      s(0);
      expect(writerSeen).toEqual([1, 4, 1, 4]);
      expect(sumSeen).toEqual([1, 4, 1, 4]);

      s(5);
      expect(writerSeen).toEqual([1, 4, 1, 4, 16]);
      expect(sumSeen).toEqual([1, 4, 1, 4, 16]);
    });

    it("diamond: computed getter counts stay minimal across a self-write cycle", () => {
      const s = signal(0);
      let aRuns = 0;
      let bRuns = 0;
      const a = computed(() => (aRuns++, s() + 1));
      const b = computed(() => (bRuns++, s() * 2));
      effect(() => {
        a();
        b();
        if (s() === 0) s(1);
      });
      // first read + one recompute for the committed self-write
      expect([aRuns, bRuns]).toEqual([2, 2]);
      s(0);
      expect([aRuns, bRuns]).toEqual([4, 4]);
    });
  });

  describe("no-op and dropped deps", () => {
    it("self-write equal to the current value: no extra runs", () => {
      const s = signal(1);
      let runs = 0;
      effect(() => {
        runs++;
        s(s());
      });
      expect(runs).toBe(1);
      s(1);
      expect(runs).toBe(1);
      s(2);
      expect(runs).toBe(2);
    });

    it("self-write A→B→A within one run nets to no change", () => {
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        if (s() !== "idle") return;
        s("pending");
        s("idle");
      });
      expect(runs).toBe(1);
      s("idle");
      expect(runs).toBe(1);
      s("x");
      expect(runs).toBe(2);
    });

    it("dep dropped by a branch after a self-write is no longer tracked", () => {
      const flag = signal(true);
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        if (flag() && s() === "idle") s("pending");
      });
      expect(runs).toBe(2);
      flag(false);
      expect(runs).toBe(3);
      s("idle");
      s("x");
      expect(runs).toBe(3);
      flag(true);
      expect(runs).toBe(4);
      expect(s()).toBe("x");
      s("idle");
      expect(runs).toBe(6);
      expect(s()).toBe("pending");
    });

    it("write to a dep the current run no longer reads is not a self-write", () => {
      const flag = signal(true);
      const s = signal("a");
      let runs = 0;
      effect(() => {
        runs++;
        if (flag()) s();
        else s("written");
      });
      flag(false);
      expect(runs).toBe(2);
      s("x");
      s("a");
      expect(runs).toBe(2);
    });
  });

  describe("errors", () => {
    it("a run that throws after self-writing; next external write still re-runs", () => {
      const s = signal("idle");
      let runs = 0;
      let shouldThrow = false;
      effect(() => {
        runs++;
        if (s() !== "idle") return;
        s("pending");
        if (shouldThrow) throw new Error("boom");
      });
      expect(runs).toBe(2);
      shouldThrow = true;
      expect(() => s("idle")).toThrow("boom");
      // No re-run after a throw.
      expect(runs).toBe(3);
      expect(s()).toBe("pending");
      shouldThrow = false;
      s("idle");
      expect(runs).toBe(5);
      s("idle");
      expect(runs).toBe(7);
    });

    it("first run that throws after self-writing; next external write still re-runs", () => {
      const s = signal("idle");
      let runs = 0;
      let shouldThrow = true;
      expect(() =>
        effect(() => {
          runs++;
          if (s() !== "idle") return;
          s("pending");
          if (shouldThrow) throw new Error("boom");
        }),
      ).toThrow("boom");
      expect(runs).toBe(1);
      shouldThrow = false;
      s("idle");
      expect(runs).toBe(3);
      expect(s()).toBe("pending");
    });

    it("a computed throwing after the effect's own write doesn't hide the effect's error", () => {
      const s = signal(0);
      const c = computed(() => {
        if (s() === 1) throw new Error("from-computed");
        return s();
      });
      expect(() =>
        effect(() => {
          c();
          untracked(() => s(1));
          throw new Error("from-effect");
        }),
      ).toThrow("from-effect");
    });
  });

  describe("nested scopes", () => {
    it("self-write to a dep read inside a nested effectScope; revert re-runs", () => {
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        let v = "";
        effectScope(() => {
          v = s();
        });
        if (v === "idle") untracked(() => s("pending"));
      });
      expect(runs).toBe(2);
      s("idle");
      expect(runs).toBe(4);
    });

    it("two levels of nested scopes", () => {
      const s = signal("idle");
      let runs = 0;
      effect(() => {
        runs++;
        let v = "";
        effectScope(() => {
          effectScope(() => {
            v = s();
          });
        });
        if (v === "idle") untracked(() => s("pending"));
      });
      expect(runs).toBe(2);
      s("idle");
      expect(runs).toBe(4);
      s("idle");
      expect(runs).toBe(6);
    });
  });

  describe("disposal and cleanup", () => {
    it("stopped effect does not run after a self-write and external revert", () => {
      const s = signal("idle");
      let runs = 0;
      const stop = effect(() => {
        runs++;
        if (s() === "idle") s("pending");
      });
      expect(runs).toBe(2);
      stop();
      s("idle");
      s("x");
      expect(runs).toBe(2);
    });

    it("stopped after a few cycles stays stopped", () => {
      const s = signal("idle");
      let runs = 0;
      const stop = effect(() => {
        runs++;
        if (s() === "idle") s("pending");
      });
      s("idle");
      s("idle");
      expect(runs).toBe(6);
      stop();
      s("idle");
      expect(runs).toBe(6);
    });

    it("onCleanup runs in order before each re-run", () => {
      const s = signal("idle");
      const log: string[] = [];
      const stop = effect(() => {
        const v = s();
        log.push(`run:${v}`);
        onCleanup(() => log.push(`cleanup:before:${v}`));
        if (v === "idle") s("pending");
        onCleanup(() => log.push(`cleanup:after:${v}`));
      });
      const cycle = [
        "run:idle",
        "cleanup:before:idle",
        "cleanup:after:idle",
        "run:pending",
      ];
      expect(log).toEqual(cycle);
      log.length = 0;
      s("idle");
      expect(log).toEqual([
        "cleanup:before:pending",
        "cleanup:after:pending",
        ...cycle,
      ]);
      log.length = 0;
      stop();
      expect(log).toEqual(["cleanup:before:pending", "cleanup:after:pending"]);
    });

    it("child that self-writes is disposed before parent cleanup on re-run", () => {
      const s = signal("idle");
      const log: string[] = [];
      effect(() => {
        if (s() !== "idle") return;
        log.push("parent:run");
        effect(() => {
          log.push("child:run");
          s("pending");
          onCleanup(() => log.push("child:cleanup"));
        });
        onCleanup(() => log.push("parent:cleanup"));
      });
      // The child's write re-runs the parent: the child is disposed first.
      const cycle = ["parent:run", "child:run", "child:cleanup", "parent:cleanup"];
      expect(log).toEqual(cycle);
      log.length = 0;
      s("idle");
      expect(log).toEqual(cycle);
    });

    it("effectScope disposal stops a self-writing effect", () => {
      const s = signal("idle");
      let runs = 0;
      const dispose = effectScope(() => {
        effect(() => {
          runs++;
          if (s() === "idle") s("pending");
        });
      });
      expect(runs).toBe(2);
      s("idle");
      expect(runs).toBe(4);
      dispose();
      s("idle");
      expect(runs).toBe(4);
    });
  });
});

describe("own write changes a computed the effect read", () => {
  it("re-runs once so the effect sees the new derived value", () => {
    const s = signal(0);
    const c = computed(() => s() * 2);
    const seen: number[] = [];
    effect(() => {
      seen.push(c());
      if (s() < 1) s(1);
    });
    expect(seen).toEqual([0, 2]);
  });

  it("a computed's write during the run re-runs the effect", () => {
    const t = signal(0);
    const a = computed(() => t() * 10);
    const b = computed(() => {
      if (t() < 1) t(1);
      return t();
    });
    const seen: number[] = [];
    effect(() => {
      seen.push(a());
      b();
    });
    expect(seen).toEqual([0, 10]);
  });
});

describe("effect re-runs", () => {

  it("a child effect's write to a signal the parent read re-runs the parent", () => {
    const s = signal(0);
    const seen: number[] = [];
    effect(() => {
      seen.push(s());
      effect(() => {
        if (untracked(s) === 0) s(1);
      });
    });
    expect(seen).toEqual([0, 1]);
  });

  it("writes in an effect that read many values stay linear", () => {
    const n = 3000;
    const sigs = Array.from({ length: n }, () => signal(0));
    const comps = sigs.map((s) => computed(() => s() + 1));
    const t0 = performance.now();
    effect(() => {
      for (let i = 0; i < n; i++) comps[i]();
      for (let i = 0; i < n; i++) untracked(() => sigs[i](untracked(sigs[i]) + 0));
      for (let i = 0; i < n; i++) sigs[i](1);
    });
    expect(performance.now() - t0).toBeLessThan(50);
  });
});

describe("own writes: edge cases", () => {
  it("re-runs when a computed it read throws after its own write", () => {
    const s = signal(0);
    const c = computed(() => {
      if (s() === 1) throw new Error("boom");
      return s();
    });
    let last: number | undefined;
    expect(() =>
      effect(() => {
        s();
        last = c();
        if (last === 0) untracked(() => s(1));
      }),
    ).toThrow("boom");
    s(2);
    expect(last).toBe(2);
  });

  it("an effect that disposes itself mid-run stays disposed", () => {
    const s = signal(0);
    const go = signal(false);
    let runs = 0;
    const stop = effect(() => {
      runs++;
      s();
      if (go()) {
        effect(() => untracked(() => s(s() + 1)));
        stop();
      }
    });
    go(true);
    s(10);
    expect(runs).toBe(2);
  });

  it("a child's write to a dep the parent reads later doesn't re-run it", () => {
    const t = signal(0);
    const rect = signal({ w: 0 });
    let runs = 0;
    effect(() => {
      runs++;
      t();
      effect(() => rect({ w: 100 + untracked(t) }));
      rect().w;
    });
    t(1);
    expect(runs).toBe(2);
  });

  it("other effects see writes made before an effect threw", () => {
    const x = signal(0);
    const b = signal(0);
    const seenB: number[] = [];
    effect(() => seenB.push(b()));
    effect(() => {
      if (x() === 1) {
        b(1);
        throw new Error("A failed");
      }
    });
    expect(() => x(1)).toThrow("A failed");
    expect(seenB).toEqual([0, 1]);
  });
});

describe("an effect re-runs after its own writes", () => {
  it("runs once more to see its own write; a write back re-runs it", () => {
    const s = signal("idle");
    const seen: string[] = [];
    effect(() => {
      seen.push(s());
      if (s() === "idle") untracked(() => s("pending"));
    });
    expect(seen).toEqual(["idle", "pending"]);
    s("idle");
    expect(seen).toEqual(["idle", "pending", "idle", "pending"]);
  });

  it("works for an effect created in another effect's first run", () => {
    const s = signal("idle");
    let runs = 0;
    effect(() => {
      effect(() => {
        runs++;
        if (s() === "idle") untracked(() => s("pending"));
      });
    });
    expect(runs).toBe(2);
    s("idle");
    expect(runs).toBe(4);
  });

  it("works when another effect also reads the signal", () => {
    const s = signal(0);
    effect(() => void s());
    const seen: number[] = [];
    effect(() => {
      const v = s();
      seen.push(v);
      if (v < 3) untracked(() => s(v + 1));
    });
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it("sees a write that leaves a computed it read first unchanged", () => {
    const s = signal(0);
    const c = computed(() => s() % 5);
    const seen: string[] = [];
    effect(() => {
      seen.push(`${c()}:${s()}`);
      if (untracked(s) < 5) s(5);
    });
    expect(seen).toEqual(["0:0", "0:5"]);
  });

  it("a child's settling write re-runs the parent once", () => {
    const sel = signal<string | null>(null);
    const seen: (string | null)[] = [];
    effect(() => {
      seen.push(sel());
      effect(() => {
        if (untracked(sel) === null) sel("first");
      });
    });
    expect(seen).toEqual([null, "first"]);
  });

  it("doesn't re-run when the body threw", () => {
    const s = signal(0);
    let runs = 0;
    expect(() =>
      effect(() => {
        runs++;
        s();
        untracked(() => s(1));
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(runs).toBe(1);
  });

  it("an effect disposed by its owner mid-run stays disposed", () => {
    const kill = signal(false);
    const st = signal("idle");
    let runs = 0;
    const stopScope = effectScope(() => {
      effect(() => {
        runs++;
        if (kill()) stopScope();
        if (st() === "idle") st("pending");
      });
    });
    batch(() => {
      kill(true);
      st("idle");
    });
    const atDispose = runs;
    st("idle");
    st("x");
    st("idle");
    expect(runs).toBe(atDispose);
  });

  it("an effect that stops itself mid-run doesn't run again", () => {
    const done = signal(false);
    const st = signal("idle");
    let stopped = false;
    let afterStop = 0;
    const stop: () => void = effect(() => {
      if (stopped) afterStop++;
      if (done() && stop) {
        stop();
        stopped = true;
      }
      if (st() === "idle") st("pending");
    });
    batch(() => {
      done(true);
      st("idle");
    });
    st("idle");
    expect(afterStop).toBe(0);
  });

  it("a parent doesn't run nested inside itself when its child is notified", () => {
    const s = signal(0);
    let depth = 0;
    let max = 0;
    effect(() => {
      max = Math.max(max, ++depth);
      effect(() => void s());
      if (s() < 1) s(1);
      depth--;
    });
    expect(max).toBe(1);
    expect(s()).toBe(1);
  });

  it("an endless self-write overflows the stack instead of hanging", () => {
    const s = signal(0);
    expect(() => effect(() => s(s() + 1))).toThrow(RangeError);
  });
});
