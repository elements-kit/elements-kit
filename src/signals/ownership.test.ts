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

describe("roots", () => {
  // root(fn): effectScope whose body gets its own dispose; an early dispose
  // applies once the body returns.
  function root<T>(fn: (dispose: () => void) => T): T {
    let stop: (() => void) | undefined;
    let early = false;
    let result!: T;
    const dispose = () => (stop ? stop() : void (early = true));
    stop = effectScope(() => {
      result = fn(dispose);
    });
    if (early) stop();
    return result;
  }

  it("should dispose of inner computations", () => {
    let $x!: ReturnType<typeof signal<number>>;
    let $y!: () => number;

    const memo = vi.fn(() => $x() + 10);

    root((dispose) => {
      $x = signal(10);
      $y = computed(memo);
      $y(); // computeds are lazy: read once
      dispose();
    });

    expect(memo).toHaveBeenCalledTimes(1);
    $x(50);
    expect(memo).toHaveBeenCalledTimes(1);
  });

  it("should return result", () => {
    const result = root((dispose) => {
      dispose();
      return 10;
    });
    expect(result).toBe(10);
  });

  it("should create new tracking scope", () => {
    const $x = signal(0);
    const fx = vi.fn();

    const stopEffect = root((dispose) => {
      effect(() => {
        $x();
        root(() => void effect(() => fx($x())));
      });
      return dispose;
    });

    expect(fx).toHaveBeenCalledWith(0);
    expect(fx).toHaveBeenCalledTimes(1);

    stopEffect();

    $x(10);
    expect(fx).not.toHaveBeenCalledWith(10);
    expect(fx).toHaveBeenCalledTimes(1);
  });

  it("should not be reactive", () => {
    let $x!: ReturnType<typeof signal<number>>;
    const body = vi.fn();

    root(() => {
      $x = signal(0);
      $x();
      body();
    });

    expect(body).toHaveBeenCalledTimes(1);
    $x(1);
    expect(body).toHaveBeenCalledTimes(1);
  });

  it("should not throw if dispose called during active disposal process", () => {
    root((dispose) => {
      onCleanup(() => dispose());
      dispose();
    });
  });
});

describe("onCleanup order", () => {
  function root<T>(fn: (dispose: () => void) => T): T {
    let stop: (() => void) | undefined;
    let early = false;
    let result!: T;
    const dispose = () => (stop ? stop() : void (early = true));
    stop = effectScope(() => {
      result = fn(dispose);
    });
    if (early) stop();
    return result;
  }

  it("should be invoked when computation is disposed", () => {
    const disposeA = vi.fn();
    const disposeB = vi.fn();
    const disposeC = vi.fn();

    const stopEffect = root((dispose) => {
      effect(() => {
        onCleanup(disposeA);
        onCleanup(disposeB);
        onCleanup(disposeC);
      });
      return dispose;
    });

    stopEffect();

    expect(disposeA).toHaveBeenCalled();
    expect(disposeB).toHaveBeenCalled();
    expect(disposeC).toHaveBeenCalled();
  });

  it("should not trigger wrong onCleanup", () => {
    const dispose = vi.fn();

    root(() => {
      effect(() => {
        onCleanup(dispose);
      });

      const stopEffect = root((dispose) => {
        effect(() => {});
        return dispose;
      });

      stopEffect();
      expect(dispose).toHaveBeenCalledTimes(0);
    });
  });

  it("should clean up in reverse order", () => {
    const disposeParent = vi.fn();
    const disposeA = vi.fn();
    const disposeB = vi.fn();
    let calls = 0;

    const stopEffect = root((dispose) => {
      effect(() => {
        onCleanup(() => disposeParent(++calls));
        effect(() => {
          onCleanup(() => disposeA(++calls));
        });
        effect(() => {
          onCleanup(() => disposeB(++calls));
        });
      });
      return dispose;
    });

    stopEffect();

    expect(disposeB).toHaveBeenCalledWith(1);
    expect(disposeA).toHaveBeenCalledWith(2);
    expect(disposeParent).toHaveBeenCalledWith(3);
  });

  it("should dispose all roots", () => {
    const disposals: string[] = [];

    const dispose = root((dispose) => {
      root(() => {
        onCleanup(() => disposals.push("SUBTREE 1"));
        effect(() => onCleanup(() => disposals.push("+A1")));
        effect(() => onCleanup(() => disposals.push("+B1")));
        effect(() => onCleanup(() => disposals.push("+C1")));
      });

      root(() => {
        onCleanup(() => disposals.push("SUBTREE 2"));
        effect(() => onCleanup(() => disposals.push("+A2")));
        effect(() => onCleanup(() => disposals.push("+B2")));
        effect(() => onCleanup(() => disposals.push("+C2")));
      });

      onCleanup(() => disposals.push("ROOT"));
      return dispose;
    });

    dispose();

    expect(disposals).toEqual([
      "+C2",
      "+B2",
      "+A2",
      "SUBTREE 2",
      "+C1",
      "+B1",
      "+A1",
      "SUBTREE 1",
      "ROOT",
    ]);
  });
});

describe("re-entrant dispose from cleanup", () => {
  function root<T>(fn: (dispose: () => void) => T): T {
    let stop: (() => void) | undefined;
    let early = false;
    let result!: T;
    const dispose = () => (stop ? stop() : void (early = true));
    stop = effectScope(() => {
      result = fn(dispose);
    });
    if (early) stop();
    return result;
  }

  describe("onCleanup disposing the scope while a computed re-evaluates", () => {
    it("runs the cleanup exactly once", () => {
      const version = signal(0);
      let cleanups = 0;

      root((dispose) => {
        const memo = computed(() => {
          const current = version();
          if (current === 0) {
            onCleanup(() => {
              cleanups++;
              dispose();
            });
          }
          return current;
        });
        effect(() => void memo());
      });

      version(1);
      expect(cleanups).toBe(1);
    });

    it("with several cleanups, each runs once, in registration order", () => {
      const version = signal(0);
      const log: string[] = [];

      root((dispose) => {
        const memo = computed(() => {
          const current = version();
          if (current === 0) {
            onCleanup(() => log.push("a"));
            onCleanup(() => {
              log.push("b");
              dispose();
            });
            onCleanup(() => log.push("c"));
          }
          return current;
        });
        effect(() => void memo());
        onCleanup(() => log.push("root"));
      });

      version(1);
      expect(log).toEqual(["a", "b", "root", "c"]);
    });

    it("same for an effect: a cleanup disposing the scope runs once", () => {
      const version = signal(0);
      let cleanups = 0;

      root((dispose) => {
        effect(() => {
          const current = version();
          if (current === 0) {
            onCleanup(() => {
              cleanups++;
              dispose();
            });
          }
        });
      });

      version(1);
      expect(cleanups).toBe(1);
    });

    it("a throwing cleanup in a computed runs once; later writes are clean", () => {
      const version = signal(0);
      let runs = 0;

      root(() => {
        const memo = computed(() => {
          const current = version();
          if (current === 0) {
            onCleanup(() => {
              runs++;
              throw new Error("cleanup boom");
            });
          }
          return current;
        });
        effect(() => void memo());
      });

      expect(() => {
        version(1);
      }).toThrow("cleanup boom");
      expect(runs).toBe(1);

      version(2);
      version(3);
      expect(runs).toBe(1);
    });
  });
});

describe("reads after dispose", () => {
  function root<T>(fn: (dispose: () => void) => T): T {
    let stop: (() => void) | undefined;
    let early = false;
    let result!: T;
    const dispose = () => (stop ? stop() : void (early = true));
    stop = effectScope(() => {
      result = fn(dispose);
    });
    if (early) stop();
    return result;
  }

  it("a computed read after its reader's scope is disposed recomputes fresh", () => {
    const count = signal(1);
    let evals = 0;
    const doubled = computed(() => {
      evals++;
      return count() * 2;
    });

    let dispose!: () => void;
    root((d) => {
      dispose = d;
      effect(() => void doubled());
    });
    const evalsObserved = evals;

    dispose();
    count(5);
    expect(doubled()).toBe(10);
    expect(evals).toBe(evalsObserved + 1);
  });
});

describe("garbage collection", () => {
  const gcFn = (globalThis as { gc?: () => void }).gc;

  function gc() {
    return new Promise((resolve) =>
      setTimeout(() => {
        gcFn!();
        resolve(undefined);
      }, 0),
    );
  }

  // Runs only with `node --expose-gc`.
  describe.runIf(gcFn)("gc", () => {
    it("should gc computed if there are no observers", async () => {
      const $x = signal(0);
      const ref = new WeakRef(computed(() => $x()));
      await gc();
      expect(ref.deref()).toBeUndefined();
    });

    it("should _not_ gc computed if there are observers", async () => {
      const $x = signal(0);
      let pointer: (() => number) | undefined;
      const ref = new WeakRef((pointer = computed(() => $x())));

      ref.deref()!();

      await gc();
      expect(ref.deref()).toBeDefined();

      pointer = undefined;
      await gc();
      expect(ref.deref()).toBeUndefined();
    });

    it("should gc root if disposed", async () => {
      const $x = signal(0);
      let ref!: WeakRef<object>;
      let pointer: (() => void) | undefined;

      const dispose = effectScope(() => {
        ref = new WeakRef(
          (pointer = computed(() => {
            $x();
          })),
        );
      });

      await gc();
      expect(ref.deref()).toBeDefined();

      dispose();
      await gc();
      expect(ref.deref()).toBeDefined();

      pointer = undefined;
      await gc();
      expect(ref.deref()).toBeUndefined();
    });

    it("a kept dispose function does not retain the root's init", async () => {
      let ref!: WeakRef<object>;
      const dispose = (() => {
        const payload = {};
        ref = new WeakRef(payload);
        return effectScope(() => {
          void payload;
        });
      })();

      await gc();
      expect(ref.deref()).toBeUndefined();
      dispose();
    });
  });
});

describe("cleanup order on dispose", () => {
  // scope() detaches from the enclosing scope, so its cleanup doesn't run here.
  it("a nested scope() isn't disposed with its parent", () => {
    const order: string[] = [];
    const [, dispose] = scope(() => {
      onCleanup(() => order.push("A"));
      onCleanup(() => order.push("B"));
      scope(() => onCleanup(() => order.push("C")));
      effect(() => onCleanup(() => order.push("D")));
    });
    dispose();
    expect(order).toEqual(["D", "A", "B"]);
  });

  it("children first (reverse creation), then the owner's cleanups in registration order", () => {
    const order: string[] = [];
    const dispose = effectScope(() => {
      onCleanup(() => order.push("A"));
      onCleanup(() => order.push("B"));
      effectScope(() => onCleanup(() => order.push("C")));
      effect(() => onCleanup(() => order.push("D")));
    });
    dispose();
    expect(order).toEqual(["D", "C", "A", "B"]);
  });
});

describe("tabbed view ownership", () => {
  // A tabbed view: a computed builds each tab's effects and computeds. Checks
  // total disposal, cleanup exactly once, children disposed on the parent's
  // re-run, and glitch-free batches.

  /** An effect whose apply step runs untracked. */
  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }

  const count = (log: string[], entry: string) =>
    log.filter((e) => e === entry).length;

  function tabs() {
    const tab = signal(1);
    const counter = signal(0);
    const label = signal("a");
    const theme = signal("light");
    const show = signal(true);
    const log: string[] = [];
    const runs = { upper: 0 };

    const [, dispose] = scope(() => {
      const viewMemo = computed(() => {
        const t = tab();
        onCleanup(() => void log.push(`tab${t}:cleanup`));
        if (t === 1) {
          applyEffect(counter, (c) => void log.push(`tab1:tick:${c}`));
          return "tab1";
        }
        const upper = computed(() => (runs.upper++, label().toUpperCase()));
        applyEffect(upper, (u) => void log.push(`tab${t}:effect:${u}`));
        if (t === 3)
          applyEffect(label, (l) => void log.push(`tab3:shell:${l}`));
        // A derived value per tab.
        const data = computed(() => `D${t}`);
        applyEffect(data, (v) => void log.push(`tab${t}:data:${v}`));
        return `tab${t}`;
      });
      applyEffect(viewMemo, (v) => void log.push(`render:${v}`));
      const header = computed(() => `${theme()}/${tab()}`);
      applyEffect(header, (v) => void log.push(`header:${v}`));
      applyEffect(
        () => (show() ? `panel:${tab()}/${counter()}` : "panel:hidden"),
        (v) => void log.push(v),
      );
    });

    const frames = () => log.filter((e) => /^(tab1:|render:)/.test(e));
    const panel = () => log.filter((e) => e.startsWith("panel:"));
    return {
      tab,
      counter,
      label,
      theme,
      show,
      log,
      frames,
      panel,
      runs,
      dispose,
    };
  }

  describe("ownership", () => {
    it("switching tabs disposes the old tab once; disposing the scope stops everything", () => {
      const t = tabs();
      expect(t.frames()).toEqual(["tab1:tick:0", "render:tab1"]);

      t.tab(2);
      // Tab 1 is torn down at once.
      expect(count(t.log, "tab1:cleanup")).toBe(1);
      t.counter(1);
      expect(count(t.log, "tab1:tick:1")).toBe(0);

      // Disposal is total: every cleanup once, nothing reacts after.
      t.dispose();
      expect(count(t.log, "tab1:cleanup")).toBe(1);
      expect(count(t.log, "tab2:cleanup")).toBe(1);
      const n = t.log.length;
      t.tab(3);
      t.label("z");
      t.counter(9);
      t.theme("dark");
      t.show(false);
      expect(t.log.length).toBe(n);
    });
  });

  describe("switching tabs", () => {
    it("tab 1 ticks until the switch; its cleanups run before tab 2's effects", () => {
      const t = tabs();
      t.counter(1);
      t.counter(2);
      expect(t.frames()).toEqual([
        "tab1:tick:0",
        "render:tab1",
        "tab1:tick:1",
        "tab1:tick:2",
      ]);

      t.tab(2);
      expect(t.frames()).toEqual([
        "tab1:tick:0",
        "render:tab1",
        "tab1:tick:1",
        "tab1:tick:2",
        "tab1:cleanup",
        "render:tab2",
      ]);
      // Old cleanups run before the new frame's effects.
      expect(t.log.indexOf("tab2:data:D2")).toBeGreaterThan(
        t.log.indexOf("tab1:cleanup"),
      );
      expect(t.log.indexOf("tab2:effect:A")).toBeGreaterThan(
        t.log.indexOf("tab1:cleanup"),
      );

      // The old frame is gone.
      t.counter(3);
      expect(count(t.log, "tab1:tick:3")).toBe(0);
      t.dispose();
    });
  });

  describe("children of a tab", () => {
    it("a tab's children compute and run", () => {
      const t = tabs();
      t.tab(2);
      expect(t.runs.upper).toBe(1);
      expect(count(t.log, "tab2:effect:A")).toBe(1);

      t.label("b");
      expect(t.runs.upper).toBe(2);
      expect(count(t.log, "tab2:effect:B")).toBe(1);
      t.dispose();
    });

    it("the next tab disposes them, with cleanups", () => {
      const t = tabs();
      t.tab(2);
      t.tab(3);
      expect(count(t.log, "tab2:cleanup")).toBe(1);
      expect(count(t.log, "render:tab3")).toBe(1);
      for (const entry of ["tab3:shell:a", "tab3:data:D3", "tab3:effect:A"]) {
        expect(count(t.log, entry), entry).toBe(1);
        expect(t.log.indexOf(entry), entry).toBeGreaterThan(
          t.log.indexOf("tab2:cleanup"),
        );
      }

      // Tab 2's children are dead: its upper computed and effect never run again.
      const upperBefore = t.runs.upper;
      t.label("c");
      expect(t.runs.upper - upperBefore).toBe(1); // only tab 3's upper
      expect(t.log.some((e) => e === "tab2:effect:C")).toBe(false);
      expect(count(t.log, "tab3:effect:C")).toBe(1);
      expect(count(t.log, "tab3:shell:c")).toBe(1);
      t.dispose();
      expect(count(t.log, "tab3:cleanup")).toBe(1);
    });
  });

  describe("batched writes", () => {
    it("writes in one batch publish together, with no intermediate frame", () => {
      const t = tabs();
      expect(t.log).toContain("header:light/1");
      t.counter(1);
      expect(count(t.log, "tab1:tick:1")).toBe(1);
      expect(t.panel()).toEqual(["panel:1/0", "panel:1/1"]);

      batch(() => {
        t.tab(2);
        t.theme("dark");
      });
      expect(t.log.filter((e) => e.startsWith("header:"))).toEqual([
        "header:light/1",
        "header:dark/2",
      ]);
      expect(t.panel()).toEqual(["panel:1/0", "panel:1/1", "panel:2/1"]);
      expect(count(t.log, "render:tab2")).toBe(1);
      expect(count(t.log, "tab1:cleanup")).toBe(1);
      t.dispose();
    });

    it("two tab switches in one batch build only the final tab", () => {
      const t = tabs();
      batch(() => {
        t.tab(2);
        t.tab(3);
      });
      // Only the final frame is built; tab 2 never existed.
      expect(count(t.log, "render:tab2")).toBe(0);
      expect(t.log.some((e) => e.startsWith("tab2:"))).toBe(false);
      expect(count(t.log, "render:tab3")).toBe(1);
      expect(count(t.log, "tab1:cleanup")).toBe(1);
      t.dispose();
    });

    it("a later scope reading the tab shows the current value and follows it", () => {
      const t = tabs();
      const [, mounted] = scope(() => {
        const m = computed(() => t.tab() * 10);
        applyEffect(m, (v) => void t.log.push(`mount:${v}`));
        applyEffect(t.counter, (v) => void t.log.push(`mount-counter:${v}`));
      });
      expect(t.log.filter((e) => e.startsWith("mount:"))).toEqual(["mount:10"]);
      expect(t.log.filter((e) => e.startsWith("mount-counter:"))).toEqual([
        "mount-counter:0",
      ]);
      t.tab(2);
      expect(t.log.filter((e) => e.startsWith("mount:"))).toEqual([
        "mount:10",
        "mount:20",
      ]);
      mounted();
      t.tab(3);
      expect(t.log.filter((e) => e.startsWith("mount:"))).toEqual([
        "mount:10",
        "mount:20",
      ]);
      t.dispose();
    });
  });

  describe("panel effects", () => {
    it("a write re-runs the panel with current values; same-value writes are silent", () => {
      const t = tabs();
      t.show(false);
      t.show(true);
      expect(t.panel()).toEqual(["panel:1/0", "panel:hidden", "panel:1/0"]);
      t.tab(2);
      expect(t.panel()).toEqual([
        "panel:1/0",
        "panel:hidden",
        "panel:1/0",
        "panel:2/0",
      ]);
      // Nothing else owed; a same-value write is silent.
      t.show(true);
      t.tab(2);
      expect(t.panel()).toHaveLength(4);
      t.dispose();
    });

    it("a panel opened later reads its source's current value", () => {
      const show = signal(false);
      const go = signal(false);
      const log: string[] = [];
      const [, dispose] = scope(() => {
        const data = computed(() => (go() ? "D" : "idle"));
        applyEffect(data, (v) => void log.push(`data:${v}`));
        applyEffect(
          () => (show() ? `open:${data()}` : "closed"),
          (v) => void log.push(`panel:${v}`),
        );
        applyEffect(show, (v) => void log.push(`show:${v}`));
      });
      expect(log).toEqual(["data:idle", "panel:closed", "show:false"]);
      go(true);
      show(true);
      expect(log.filter((e) => e.startsWith("panel:"))).toEqual([
        "panel:closed",
        "panel:open:D",
      ]);
      dispose();
    });
  });

  describe("a child disposed by its parent's re-run", () => {
    it("on unmount, the disposed child never runs with the unmounted value", () => {
      const mounted = signal(false);
      const show = signal(false);
      const log: string[] = [];
      let childRuns = 0;
      const [, dispose] = scope(() => {
        const details = computed(() => (mounted() ? true : false));
        applyEffect(show, (v) => void log.push(`show:${v}`));
        applyEffect(
          () => {
            if (!mounted()) return "unmounted";
            // The child, created in the pass.
            applyEffect(
              () => (childRuns++, show() ? `details:${details()}` : "hidden"),
              (v) => void log.push(v),
            );
            return "mounted";
          },
          (v) => void log.push(v),
        );
      });
      expect(log).toEqual(["show:false", "unmounted"]);

      mounted(true);
      expect(log.slice(2)).toEqual(["hidden", "mounted"]);

      show(true);
      expect(log.slice(4)).toEqual(["show:true", "details:true"]);

      // Unmount: the child also depends on `details`, which changes too —
      // it must be disposed by its parent's re-run, not run on `false`.
      const before = childRuns;
      mounted(false);
      expect(childRuns).toBe(before);
      expect(log.slice(6)).toEqual(["unmounted"]);

      show(false);
      expect(childRuns).toBe(before);
      expect(log.slice(7)).toEqual(["show:false"]);
      dispose();
    });
  });

  function pair(shared = false) {
    const a = signal(0);
    const b = signal(0);
    const log: string[] = [];
    const [, dispose] = scope(() => {
      const da = computed(() => (a() ? `a${a()}` : "a0"));
      const db = computed(() => (b() ? `b${b()}` : "b0"));
      applyEffect(da, (v) => void log.push(`A:${v}`));
      applyEffect(db, (v) => void log.push(`B:${v}`));
      applyEffect(a, (v) => void log.push(`a:${v}`));
      applyEffect(b, (v) => void log.push(`b:${v}`));
      if (shared) {
        const both = computed(() => `${da()}|${db()}`);
        applyEffect(both, (v) => void log.push(`both:${v}`));
      }
    });
    return { a, b, log, dispose };
  }

  describe("independent writes", () => {
    it("a write runs only its own readers", () => {
      const p = pair();
      expect(p.log).toEqual(["A:a0", "B:b0", "a:0", "b:0"]);
      p.b(1);
      expect(p.log.slice(4)).toEqual(["B:b1", "b:1"]);
      p.a(1);
      expect(p.log.slice(6)).toEqual(["A:a1", "a:1"]);
      p.dispose();
    });

    it("a shared computed updates once per batch, never torn", () => {
      const p = pair(true);
      p.a(1);
      p.b(1);
      expect(p.log.filter((e) => e.startsWith("both:"))).toEqual([
        "both:a0|b0",
        "both:a1|b0",
        "both:a1|b1",
      ]);
      batch(() => {
        p.a(2);
        p.b(2);
      });
      expect(p.log.filter((e) => e.startsWith("both:"))).toEqual([
        "both:a0|b0",
        "both:a1|b0",
        "both:a1|b1",
        "both:a2|b2",
      ]);
      p.dispose();
    });
  });
});
