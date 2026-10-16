import { describe, expect, it, vi } from "vitest";
import {
  batch,
  computed,
  effect,
  effectScope,
  onCleanup,
  signal,
  trigger,
  untracked,
} from "./lib";

describe("flush and batch", () => {
  // applyEffect(compute, apply): an effect whose apply step runs untracked.
  const applyEffect = <T>(compute: () => T, apply: (v: T) => void) =>
    effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });

  it("a throwing effect inside batch() doesn't stop other effects", () => {
    const a = signal(0);
    const c = signal(0);
    const seenC: number[] = [];
    const stop = effectScope(() => {
      applyEffect(a, (v) => {
        if (v === 1) throw new Error("boom");
      });
      applyEffect(c, (v) => {
        seenC.push(v);
      });
    });
    seenC.length = 0;
    expect(() => batch(() => a(1))).toThrow("boom");
    // Other effects still react.
    c(3);
    expect(seenC).toEqual([3]);
    stop();
  });

  describe("flush", () => {
    it("should batch updates", () => {
      const x = signal(10);
      const fx = vi.fn();
      const stop = effectScope(() => applyEffect(x, fx));
      expect(fx).toHaveBeenCalledTimes(1);
      batch(() => {
        x(20);
        x(30);
        x(40);
        expect(fx).toHaveBeenCalledTimes(1);
      });
      expect(fx).toHaveBeenCalledTimes(2);
      expect(fx).toHaveBeenLastCalledWith(40);
      stop();
    });

    it("unbatched writes run effects right away", () => {
      const x = signal(10);
      const fx = vi.fn();
      const stop = effectScope(() => applyEffect(x, fx));
      expect(fx).toHaveBeenCalledTimes(1);
      x(20);
      expect(fx).toHaveBeenCalledTimes(2);
      x(30);
      expect(fx).toHaveBeenCalledTimes(3);
      stop();
    });

    it("an empty batch() inside a running effect doesn't fail", () => {
      const a = signal(10);
      const fx = vi.fn(() => {
        batch(() => {});
      });
      const stop = effectScope(() => applyEffect(a, fx));
      expect(fx).toHaveBeenCalledTimes(1);
      a(20);
      expect(fx).toHaveBeenCalledTimes(2);
      stop();
    });

    it("batch() runs its callback and flushes before returning", () => {
      const x = signal(10);
      const fx = vi.fn();
      const stop = effectScope(() => applyEffect(x, fx));
      batch(() => {
        x(20);
        expect(fx).toHaveBeenCalledTimes(1);
      });
      expect(fx).toHaveBeenCalledTimes(2);
      stop();
    });

    it("nested batch() flushes once, at the outermost end", () => {
      const x = signal(10);
      const y = signal(10);
      const fx = vi.fn();
      const stop = effectScope(() => applyEffect(() => [x(), y()], fx));
      batch(() => {
        x(20);
        batch(() => {
          y(30);
        });
        expect(fx).toHaveBeenCalledTimes(1);
      });
      expect(fx).toHaveBeenCalledTimes(2);
      expect(fx).toHaveBeenLastCalledWith([20, 30]);
      stop();
    });
  });
});

describe("graph propagation", () => {
  // Computeds are lazy; `observe` keeps them live with an effect. Getters that
  // return `{}` always count as changed.

  /** Keep computeds live. */
  const observe = (...cs: (() => unknown)[]) =>
    effect(() => {
      for (const c of cs) c();
    });

  describe("graph", () => {
    it("should drop X->B->X updates", () => {
      const x = signal(2);
      const a = computed(() => x() - 1);
      const b = computed(() => x() + a());
      const compute = vi.fn(() => "c: " + b());
      const c = computed(compute);
      expect(c()).toBe("c: 3");
      expect(compute).toHaveBeenCalledTimes(1);
      compute.mockReset();
      x(4);
      c();
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should only update every signal once (diamond graph)", () => {
      const x = signal("a");
      const a = computed(() => x());
      const b = computed(() => x());
      const spy = vi.fn(() => a() + " " + b());
      const c = computed(spy);
      expect(c()).toBe("a a");
      expect(spy).toHaveBeenCalledTimes(1);
      x("aa");
      expect(c()).toBe("aa aa");
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("should only update every signal once (diamond graph + tail)", () => {
      const x = signal("a");
      const a = computed(() => x());
      const b = computed(() => x());
      const c = computed(() => a() + " " + b());
      const spy = vi.fn(() => c());
      const d = computed(spy);
      expect(d()).toBe("a a");
      expect(spy).toHaveBeenCalledTimes(1);
      x("aa");
      expect(d()).toBe("aa aa");
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("should bail out if result is the same", () => {
      const x = signal("a");
      const a = computed(() => {
        x();
        return "foo";
      });
      const spy = vi.fn(() => a());
      const b = computed(spy);
      expect(b()).toBe("foo");
      expect(spy).toHaveBeenCalledTimes(1);
      x("aa");
      expect(b()).toBe("foo");
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("should only update every signal once (jagged diamond graph + tails)", () => {
      const x = signal("a");
      const a = computed(() => x());
      const b = computed(() => x());
      const c = computed(() => b());
      const dSpy = vi.fn(() => a() + " " + c());
      const d = computed(dSpy);
      const eSpy = vi.fn(() => d());
      const e = computed(eSpy);
      const fSpy = vi.fn(() => d());
      const f = computed(fSpy);

      expect(e()).toBe("a a");
      expect(eSpy).toHaveBeenCalledTimes(1);
      expect(f()).toBe("a a");
      expect(fSpy).toHaveBeenCalledTimes(1);

      x("b");
      expect(d()).toBe("b b");
      expect(dSpy).toHaveBeenCalledTimes(2);
      expect(e()).toBe("b b");
      expect(eSpy).toHaveBeenCalledTimes(2);
      expect(f()).toBe("b b");
      expect(fSpy).toHaveBeenCalledTimes(2);

      x("c");
      expect(d()).toBe("c c");
      expect(dSpy).toHaveBeenCalledTimes(3);
      expect(e()).toBe("c c");
      expect(eSpy).toHaveBeenCalledTimes(3);
      expect(f()).toBe("c c");
      expect(fSpy).toHaveBeenCalledTimes(3);
    });

    it("should only update every signal once (jagged diamond graph + tails, observed by effects)", () => {
      const x = signal("a");
      const a = computed(() => x());
      const b = computed(() => x());
      const c = computed(() => b());
      const dSpy = vi.fn(() => a() + " " + c());
      const d = computed(dSpy);
      const eSpy = vi.fn(() => d());
      const e = computed(eSpy);
      const fSpy = vi.fn(() => d());
      const f = computed(fSpy);
      const stop = effectScope(() => {
        observe(e);
        observe(f);
      });
      x("b");
      expect(dSpy).toHaveBeenCalledTimes(2);
      expect(eSpy).toHaveBeenCalledTimes(2);
      expect(fSpy).toHaveBeenCalledTimes(2);
      expect(e()).toBe("b b");
      x("c");
      expect(dSpy).toHaveBeenCalledTimes(3);
      expect(eSpy).toHaveBeenCalledTimes(3);
      expect(fSpy).toHaveBeenCalledTimes(3);
      expect(f()).toBe("c c");
      stop();
    });

    it("should ensure subs update even if one dep is static", () => {
      const x = signal("a");
      const a = computed(() => x());
      const b = computed(() => {
        x();
        return "c";
      });
      const spy = vi.fn(() => a() + " " + b());
      const c = computed(spy);
      expect(c()).toBe("a c");
      x("aa");
      expect(c()).toBe("aa c");
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("should ensure subs update even if two deps mark it clean", () => {
      const x = signal("a");
      const b = computed(() => x());
      const c = computed(() => {
        x();
        return "c";
      });
      const d = computed(() => {
        x();
        return "d";
      });
      const spy = vi.fn(() => b() + " " + c() + " " + d());
      const e = computed(spy);
      expect(e()).toBe("a c d");
      x("aa");
      expect(e()).toBe("aa c d");
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("evaluates each stale computed once, in read order", () => {
      const s1 = signal(1);
      let order = "";
      const t1 = computed(() => {
        order += "t1";
        return s1() > 2;
      });
      const t2 = computed(() => {
        order += "t2";
        return s1() > 2;
      });
      const c1 = computed(() => {
        order += "c1";
        s1();
        return {};
      });
      const c2 = computed(() => {
        order += "c2";
        t1();
        t2();
        c1();
      });
      const stop = observe(t1, t2, c1, c2);
      order = "";
      // Same-value notify.
      trigger(s1);
      expect(order).toBe("t1t2c1c2");
      order = "";
      s1(3);
      expect(order).toBe("t1t2c1c2");
      stop();
    });

  });
});

describe("mounting many rows", () => {
  // Rows are mounted in a loop inside one batch.

  function mount(N: number) {
    let ms = 0;
    const dispose = effectScope(() => {
      const zoom = signal(1);
      const viewport = computed(() => 600 / zoom());
      const start = performance.now();
      batch(() => {
        for (let i = 0; i < N; i++) {
          const visible = computed(() => i * 10 < viewport());
          effect(() => void visible());
          const el = signal<object | null>(null);
          effect(() => void el());
          el({ i });
        }
      });
      ms = performance.now() - start;
    });
    dispose();
    return ms;
  }

  it("mounting rows with a per-row effect is linear in N", () => {
    const best = (N: number, k: number) => {
      let ms = Infinity;
      for (let i = 0; i < k; i++) ms = Math.min(ms, mount(N));
      return ms;
    };
    best(1000, 2);
    let ratio = Infinity;
    for (let round = 0; round < 3 && ratio >= 24; round++) {
      const small = best(1000, 3);
      const large = best(8000, 2);
      ratio = Math.min(ratio, large / small);
    }
    expect(ratio).toBeLessThan(24);
  });

  it("a write between two reads in one batch is visible through a computed chain", () => {
    const seen: string[] = [];
    const stop = effectScope(() => {
      const base = signal(1);
      const gate = computed(() => base() + 1);
      const n = signal(0);
      const doubled = computed(() => n() * 2);
      const label = computed(() => `n=${doubled()}`);
      batch(() => {
        for (const i of [1, 2, 3]) {
          effect(() => void gate());
          n(i + 10);
          effect(() => {
            seen.push(label());
          });
        }
      });
    });
    expect(seen.slice(0, 3)).toEqual(["n=22", "n=24", "n=26"]);
    expect(seen.slice(3)).toEqual(["n=26", "n=26"]);
    stop();
  });
});

describe("propagation isolation", () => {
  // Each leaf/join is kept live by an effect.

  it("downstream computeds skip when the derived input is unchanged", () => {
    let parityRuns = 0;
    const leafRuns: number[] = [];
    const FANOUT = 8;
    const source = signal(0);
    const stop = effectScope(() => {
      const parity = computed(() => {
        parityRuns++;
        return source() & 1;
      });
      for (let i = 0; i < FANOUT; i++) {
        leafRuns[i] = 0;
        const leaf = computed(() => {
          leafRuns[i]++;
          return parity();
        });
        effect(() => void leaf());
      }
    });

    expect(parityRuns).toBe(1);
    expect(leafRuns).toEqual(Array(FANOUT).fill(1));

    batch(() => source(2));
    expect(parityRuns).toBe(2);
    expect(leafRuns).toEqual(Array(FANOUT).fill(1));

    batch(() => source(3));
    expect(parityRuns).toBe(3);
    expect(leafRuns).toEqual(Array(FANOUT).fill(2));
    stop();
  });

  it("diamond: the join recomputes once per update, not per branch", () => {
    let joinRuns = 0;
    const source = signal(0);
    const stop = effectScope(() => {
      const left = computed(() => source() + 1);
      const right = computed(() => source() + 2);
      const join = computed(() => {
        joinRuns++;
        return left() + right();
      });
      effect(() => void join());
    });
    expect(joinRuns).toBe(1);
    batch(() => source(1));
    expect(joinRuns).toBe(2);
    stop();
  });
});

describe("untracked", () => {
  const applyEffect = <T>(compute: () => T, apply: (v: T) => void) =>
    effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });

  it("should not create dependency", () => {
    const fx = vi.fn();
    const memo = vi.fn();
    const x = signal(10);
    const a = computed(() => x() + 10);
    const b = computed(() => {
      memo();
      return untracked(a) + 10;
    });
    const stop = effectScope(() =>
      applyEffect(
        () => {
          fx();
          expect(untracked(x)).toBe(10);
          expect(untracked(a)).toBe(20);
          expect(untracked(b)).toBe(30);
        },
        () => {},
      ),
    );
    expect(fx).toHaveBeenCalledTimes(1);
    expect(memo).toHaveBeenCalledTimes(1);
    x(20);
    expect(fx).toHaveBeenCalledTimes(1);
    expect(memo).toHaveBeenCalledTimes(1);
    stop();
  });

  it("untracked deps never invalidate a computed's cache", () => {
    const fx = vi.fn();
    const memo = vi.fn();
    const x = signal(10);
    const y = signal(10);
    const z = signal(10);
    const a = computed(() => {
      memo();
      return x() + untracked(y) + untracked(z) + 10;
    });
    const stop = effectScope(() =>
      applyEffect(
        () => {
          fx();
          expect(untracked(a)).toBe(40);
        },
        () => {},
      ),
    );
    x(20);
    expect(a()).toBe(50);
    y(20);
    z(20);
    expect(a()).toBe(50);
    expect(memo).toHaveBeenCalledTimes(2);
    x(30);
    expect(a()).toBe(80);
    expect(memo).toHaveBeenCalledTimes(3);
    expect(fx).toHaveBeenCalledTimes(1);
    stop();
  });

  // Guards: scope.ts relies on untracked() detaching ownership.
  it("a scope created inside untracked() outlives the enclosing scope", () => {
    const x = signal(0);
    const childCompute = vi.fn();
    const childDispose = vi.fn();

    function createChild() {
      const a = computed(() => x() * 2);
      effectScope(() =>
        applyEffect(
          () => {
            childCompute(a());
            onCleanup(childDispose);
          },
          () => {},
        ),
      );
    }

    const dispose = effectScope(() => {
      untracked(() => createChild());
    });

    x(1);
    expect(childCompute).toHaveBeenCalledWith(2);
    expect(childDispose).toHaveBeenCalledTimes(1);

    dispose();
    expect(childDispose).toHaveBeenCalledTimes(1);

    x(2);
    expect(childCompute).toHaveBeenCalledWith(4);
    expect(childDispose).toHaveBeenCalledTimes(2);
  });
});

describe("untracked reads and tracking", () => {
  it("a computed created inside untracked still tracks", () => {
    const x = signal(10);
    let m!: () => number;
    let runs = 0;
    const dispose = effectScope(() => {
      untracked(() => {
        m = computed(() => (runs++, x() * 2));
      });
    });
    expect(m()).toBe(20);
    x(11);
    expect(m()).toBe(22);
    expect(runs).toBe(2);
    dispose();
  });

  it("an effect created inside untracked still tracks", () => {
    const x = signal(10);
    const seen: number[] = [];
    const dispose = effectScope(() => {
      untracked(() => {
        effect(() => void seen.push(x()));
      });
    });
    x(11);
    expect(seen).toEqual([10, 11]);
    dispose();
  });

  it("reads in nested untracked inside an effect don't subscribe", () => {
    const x = signal(10);
    let runs = 0;
    const dispose = effect(() => {
      runs++;
      untracked(() => {
        untracked(() => x());
        x(); // still untracked after the inner call restores
      });
    });
    x(11);
    expect(runs).toBe(1);
    dispose();
  });

  it("restores tracking after nested untracked calls return", () => {
    const x = signal(10);
    const y = signal(0);
    let runs = 0;
    const dispose = effect(() => {
      runs++;
      untracked(() => untracked(() => x()));
      y(); // tracked again
    });
    x(11);
    expect(runs).toBe(1);
    y(1);
    expect(runs).toBe(2);
    dispose();
  });
});

