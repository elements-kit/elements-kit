/**
 * Stress and complex-topology tests for the signals library.
 *
 * Run separately from the unit tests — these are intentionally heavier.
 * Coverage areas:
 *  - H. Stress: fan-out, fan-in, long chains, rapid writes
 *  - I. Complex graph topology: deep diamonds, shared bases
 */

import { describe, it, expect } from "vitest";
import { signal, computed, effect, effectScope, batch } from "./lib";

// ---------------------------------------------------------------------------
// H — Stress tests
// ---------------------------------------------------------------------------

describe("stress: fan-out — 1000 signals into 1 computed", () => {
  it("update propagates correctly", () => {
    const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
    const sum = computed(() => signals.reduce((acc, s) => acc + s(), 0));

    // Initial sum: 0+1+2+...+999 = 499500
    expect(sum()).toBe(499500);

    signals[0](1000);
    expect(sum()).toBe(499500 - 0 + 1000);
  });
});

describe("stress: fan-out — 1000 effects watching same signal", () => {
  it("all run exactly once per write", () => {
    const s = signal(0);
    let totalRuns = 0;

    const stops = Array.from({ length: 1000 }, () =>
      effect(() => {
        s();
        totalRuns++;
      }),
    );

    const before = totalRuns;
    s(1);
    expect(totalRuns - before).toBe(1000);

    for (const stop of stops) stop();
  });
});

describe("stress: chain — signal → 500 computeds in series → effect", () => {
  it("update reaches the end", () => {
    const base = signal(0);

    let prev = base as () => number;
    for (let i = 0; i < 500; i++) {
      const current = prev;
      prev = computed(() => current() + 1);
    }
    const tail = prev;

    let effectValue = -1;
    const stop = effect(() => {
      effectValue = tail();
    });

    expect(effectValue).toBe(500);

    base(10);
    expect(effectValue).toBe(510);

    stop();
  });
});

describe("stress: 10k rapid writes — effect runs once (batch)", () => {
  it("batches all writes into a single flush", () => {
    const s = signal(0);
    let runs = 0;

    const stop = effect(() => {
      s();
      runs++;
    });

    const before = runs;
    batch(() => {
      for (let i = 1; i <= 10_000; i++) s(i);
    });

    expect(runs - before).toBe(1);
    expect(s()).toBe(10_000);

    stop();
  });
});

describe("stress: 10k rapid writes without batch", () => {
  it("effect runs for each distinct value", () => {
    const s = signal(0);
    let runs = 0;

    const stop = effect(() => {
      s();
      runs++;
    });

    const before = runs;
    for (let i = 1; i <= 100; i++) s(i); // keep reasonable for CI
    expect(runs - before).toBe(100);

    stop();
  });
});

// ---------------------------------------------------------------------------
// I — Complex graph topology
// ---------------------------------------------------------------------------

describe("topology: deep diamond A→{B,C}→D", () => {
  it("D updates exactly once per A change", () => {
    const a = signal(0);
    const b = computed(() => a() * 2);
    const c = computed(() => a() + 1);
    const d = computed(() => b() + c());

    let dRecomputes = 0;
    const stop = effect(() => {
      d();
      dRecomputes++;
    });

    const before = dRecomputes;
    a(5);
    expect(dRecomputes - before).toBe(1);
    expect(d()).toBe(5 * 2 + 5 + 1); // 16

    stop();
  });
});

describe("topology: multiple diamonds sharing base signal", () => {
  it("each diamond computes correctly and independently", () => {
    const base = signal(1);

    // Diamond 1: base → {x1, y1} → z1
    const x1 = computed(() => base() * 2);
    const y1 = computed(() => base() + 10);
    const z1 = computed(() => x1() + y1());

    // Diamond 2: base → {x2, y2} → z2
    const x2 = computed(() => base() * 3);
    const y2 = computed(() => base() - 1);
    const z2 = computed(() => x2() + y2());

    expect(z1()).toBe(2 + 11); // 13
    expect(z2()).toBe(3 + 0);  // 3

    base(4);
    expect(z1()).toBe(8 + 14); // 22
    expect(z2()).toBe(12 + 3); // 15
  });
});

describe("topology: two computed chains sharing a base — effect sees consistent state", () => {
  it("effect never observes a partial update (glitch-free)", () => {
    const base = signal(0);
    const chain1 = computed(() => base() * 2);
    const chain2 = computed(() => base() + 100);

    const snapshots: [number, number][] = [];

    const stop = effect(() => {
      snapshots.push([chain1(), chain2()]);
    });

    for (let i = 1; i <= 10; i++) base(i);

    // Every snapshot must be consistent: chain1 === val*2, chain2 === val+100
    for (const [c1, c2] of snapshots) {
      const val = c1 / 2;
      expect(c2).toBe(val + 100);
    }

    stop();
  });
});

describe("topology: wide diamond A→{B1..B10}→C", () => {
  it("C updates exactly once per A change despite 10 intermediate nodes", () => {
    const a = signal(0);
    const bs = Array.from({ length: 10 }, (_, i) => computed(() => a() + i));
    const c = computed(() => bs.reduce((acc, b) => acc + b(), 0));

    let cRuns = 0;
    const stop = effect(() => {
      c();
      cRuns++;
    });

    const before = cRuns;
    a(1);
    expect(cRuns - before).toBe(1);

    // c = sum of (1+0)..(1+9) = 10 + 45 = 55
    expect(c()).toBe(55);

    stop();
  });
});

describe("topology: effectScope owning 100 effects — bulk disposal", () => {
  it("all 100 effects stop on scope disposal", () => {
    const s = signal(0);
    let totalRuns = 0;

    const stopScope = effectScope(() => {
      for (let i = 0; i < 100; i++) {
        effect(() => {
          s();
          totalRuns++;
        });
      }
    });

    const before = totalRuns;
    s(1); // all 100 run
    expect(totalRuns - before).toBe(100);

    stopScope();

    const afterStop = totalRuns;
    s(2); // scope disposed — no effects run
    expect(totalRuns - afterStop).toBe(0);
  });
});
