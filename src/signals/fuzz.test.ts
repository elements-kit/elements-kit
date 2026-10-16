import { describe, expect, it } from "vitest";
import { batch, computed, effect, signal, untracked } from "./lib";

// Random graphs with fixed seeds, checked against a from-scratch oracle:
// - coherence: no reader sees a torn view;
// - final values: settled computeds equal a from-scratch recompute;
// - progress: nothing is owed after a step, and no effect runs extra.

// mulberry32: small deterministic PRNG.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Kind = "sum" | "max" | "branch" | "id";
type Spec = { kind: Kind; deps: number[] };
type Read = (i: number) => number;

// Small value ranges so equality cut-offs fire often.
function evalSpec(spec: Spec, read: Read): number {
  const d = spec.deps;
  switch (spec.kind) {
    case "id":
      return read(d[0]);
    case "sum":
      return d.reduce((acc, j) => acc + read(j), 0) % 3;
    case "max":
      return d.reduce((acc, j) => Math.max(acc, read(j)), 0);
    case "branch":
      // Dynamic deps: reads only one of the two arms.
      return read(d[0]) % 2 ? read(d[1]) : read(d[2]);
  }
}

function randomSpec(r: () => number, upTo: number): Spec {
  const pick = () => Math.floor(r() * upTo);
  const roll = r();
  if (roll < 0.15) return { kind: "id", deps: [pick()] };
  if (roll < 0.45) return { kind: "branch", deps: [pick(), pick(), pick()] };
  const n = 1 + Math.floor(r() * 3);
  return {
    kind: roll < 0.75 ? "sum" : "max",
    deps: Array.from({ length: n }, pick),
  };
}

type Mode = "watched" | "lazy";

function runCase(seed: number, mode: Mode) {
  const r = rng(seed);
  const S = 2 + Math.floor(r() * 4);
  const C = 2 + Math.floor(r() * 10);
  const E = 1 + Math.floor(r() * 6);
  const STEPS = 25;

  // Nodes 0..S-1 are signals, S..S+C-1 computeds (each depends on earlier nodes).
  const specs: Spec[] = [];
  for (let i = 0; i < C; i++) specs.push(randomSpec(r, S + i));
  const effSpecs: Spec[] = [];
  for (let k = 0; k < E; k++) effSpecs.push(randomSpec(r, S + C));

  // Shadow of signal values for the oracle.
  const shadow = Array.from({ length: S }, () => Math.floor(r() * 3));
  const oracle: Read = (i) =>
    i < S ? shadow[i] : evalSpec(specs[i - S], oracle);

  const ctx = `seed=${seed} mode=${mode}`;
  const getters: Array<() => number> = [];
  // Signals.
  const signals = shadow.map((v) => signal(v));
  for (const s of signals) getters.push(s as () => number);

  // Computeds.
  const cRuns = new Array(C).fill(0);
  const cLastReads: Array<Array<[number, number]> | undefined> = new Array(C);
  for (let i = 0; i < C; i++) {
    const spec = specs[i];
    getters.push(
      computed(() => {
        cRuns[i]++;
        const prev = cLastReads[i];
        if (mode === "watched" && prev !== undefined) {
          // No extra runs: a watched computed re-runs only if a dep it read changed.
          const changed = prev.some(([j, v]) => oracle(j) !== v);
          if (!changed) throw new Error(`${ctx}: spurious recompute of c${i}`);
        }
        const reads: Array<[number, number]> = [];
        const v = evalSpec(spec, (j) => {
          const x = getters[j]();
          reads.push([j, x]);
          return x;
        });
        cLastReads[i] = reads;
        return v;
      }),
    );
  }

  // Effects.
  const eRuns = new Array(E).fill(0);
  const eLastReads: Array<Array<[number, number]>> = new Array(E);
  const errors: string[] = [];
  const stops: Array<(() => void) | undefined> = [];
  const makeEffect = (k: number, spec: Spec) =>
    effect(() => {
      eRuns[k]++;
      const reads: Array<[number, number]> = [];
      evalSpec(spec, (j) => {
        const x = getters[j]();
        // Coherence: every read matches the oracle on committed inputs.
        if (x !== oracle(j))
          errors.push(`${ctx}: e${k} read n${j}=${x}, oracle ${oracle(j)}`);
        reads.push([j, x]);
        return x;
      });
      eLastReads[k] = reads;
    });
  for (let k = 0; k < E; k++) stops.push(makeEffect(k, effSpecs[k]));
  // "watched" mode: one extra effect keeps every computed observed for the whole case.
  const allIdx = E;
  if (mode === "watched") {
    eRuns.push(0);
    stops.push(
      effect(() => {
        eRuns[allIdx]++;
        const reads: Array<[number, number]> = [];
        for (let i = S; i < S + C; i++) {
          const x = getters[i]();
          if (x !== oracle(i))
            errors.push(
              `${ctx}: watch-all read n${i}=${x}, oracle ${oracle(i)}`,
            );
          reads.push([i, x]);
        }
        eLastReads[allIdx] = reads;
      }),
    );
  }
  expect(errors, ctx).toEqual([]);

  const subStep = (writes: Array<[number, number]>, batched: boolean) => {
    const before = eRuns.slice();
    const cBefore = cRuns.slice();
    // Apply writes to the shadow first to compute who must run.
    for (const [i, v] of writes) shadow[i] = v;
    const expected = eLastReads.map(
      (reads, k) =>
        stops[k] !== undefined && reads.some(([j, v]) => oracle(j) !== v),
    );
    const doWrites = () => {
      for (const [i, v] of writes) signals[i](v);
    };
    if (batched) batch(doWrites);
    else doWrites();
    expect(errors, ctx).toEqual([]);
    // No extra runs; effects run exactly when a read value changed (progress + equality cut-off).
    for (let k = 0; k < eRuns.length; k++) {
      expect(
        eRuns[k] - before[k],
        `${ctx}: e${k} runs after ${JSON.stringify(writes)}`,
      ).toBe(expected[k] ? 1 : 0);
    }
    // Final values: every computed equals a from-scratch recompute.
    for (let i = 0; i < C; i++) {
      expect(untracked(getters[S + i]), `${ctx}: c${i}`).toBe(oracle(S + i));
    }
    for (let i = 0; i < C; i++) {
      expect(
        cRuns[i] - cBefore[i],
        `${ctx}: c${i} ran more than once`,
      ).toBeLessThanOrEqual(1);
    }
  };

  for (let step = 0; step < STEPS; step++) {
    const roll = r();
    if (roll < 0.08) {
      // Dispose a random effect: it must never run again.
      const k = Math.floor(r() * E);
      stops[k]?.();
      stops[k] = undefined;
      continue;
    }
    const n = 1 + Math.floor(r() * 3);
    const writes: Array<[number, number]> = [];
    for (let w = 0; w < n; w++)
      writes.push([Math.floor(r() * S), Math.floor(r() * 3)]);
    if (roll < 0.55) {
      subStep(writes, true);
    } else {
      // Unbatched: each write is its own sub-step.
      for (const w of writes) subStep([w], false);
    }
  }
  for (const s of stops) s?.();
}

// Slow on CI runners: allow time for the seed loops.
describe("fuzz: random graphs (coherence, final values, no extra runs)", { timeout: 60_000 }, () => {
  for (const mode of ["watched", "lazy"] as const) {
    it(`random graphs, ${mode} computeds, seeds 3289..3488`, () => {
      for (let seed = 3289; seed < 3289 + 200; seed++) runCase(seed, mode);
    });
  }
  it("random graphs, seed 91501..91600 (watched)", () => {
    for (let seed = 91501; seed < 91601; seed++) runCase(seed, "watched");
  });
});

// ---------------------------------------------------------------------------
// Writing effects: same oracle, but effects also write signals (often their
// own deps) during their run. Writes only raise a value, so each step ends.
// ---------------------------------------------------------------------------

type WriteMode = "direct" | "untracked" | "child";
type Writer = {
  t: number;
  cond: number;
  k: number;
  mode: WriteMode;
  after?: number;
};
type EffSpec = { spec: Spec; w?: Writer; throws: boolean };
type LastRun = {
  reads: Array<[number, number]>;
  lastSeen: Array<[number, number]>;
  own: Set<number>;
  epoch: number;
  /** The run threw: it isn't re-run, so it may end on a stale read. */
  threw: boolean;
  /** A child effect wrote during the run: the parent re-runs to see it. */
  childWrote: boolean;
};

// Returns stale last-reads (see check (4) below).
function runWriteCase(
  seed: number,
  mode: Mode,
  withThrows: boolean,
  trace?: string[],
): string[] {
  const strict: string[] = [];
  const T = (m: string) => trace?.push(m);
  const r = rng(seed);
  const S = 2 + Math.floor(r() * 4);
  const C = 1 + Math.floor(r() * 8);
  const E = 2 + Math.floor(r() * 5);
  const STEPS = 25;
  const pick = (n: number) => Math.floor(r() * n);

  const specs: Spec[] = [];
  for (let i = 0; i < C; i++) specs.push(randomSpec(r, S + i));
  // Static closure: which signals each node can depend on.
  const reach: Array<Set<number>> = [];
  for (let i = 0; i < S; i++) reach.push(new Set([i]));
  for (const sp of specs)
    reach.push(new Set(sp.deps.flatMap((j) => [...reach[j]])));

  const effSpecs: EffSpec[] = [];
  for (let k = 0; k < E; k++) {
    const spec = randomSpec(r, S + C);
    let w: Writer | undefined;
    if (r() < 0.6) {
      const t = pick(S);
      // Condition on the target itself (classic self-write) or on any node.
      const cond = r() < 0.5 ? t : pick(S + C);
      const modeRoll = r();
      const wm: WriteMode =
        modeRoll < 0.5 ? "direct" : modeRoll < 0.75 ? "untracked" : "child";
      w = {
        t,
        cond,
        k: 1 + pick(3),
        mode: wm,
        after: r() < 0.4 ? pick(S + C) : undefined,
      };
    }
    effSpecs.push({ spec, w, throws: withThrows && r() < 0.35 });
  }

  const shadow = Array.from({ length: S }, () => pick(3));
  const oracle: Read = (i) =>
    i < S ? shadow[i] : evalSpec(specs[i - S], oracle);
  const ctx = `seed=${seed} mode=${mode} throws=${withThrows}`;
  T(
    `S=${S} specs=${JSON.stringify(specs)} effs=${JSON.stringify(effSpecs)} shadow=${JSON.stringify(shadow)}`,
  );
  const errors: string[] = [];

  const signals = shadow.map((v) => signal(v));
  const getters: Array<() => number> = signals.map((s) => s as () => number);

  // A dep that changes and changes back within one flush still dirties its
  // readers if the middle value was observed, so "spurious" means: no signal
  // upstream of anything read changed at all since the last run.
  let epoch = 0;
  let watchingAll = false;
  const changedAt = new Array(S).fill(0);
  const quiet = (reads: Array<[number, number]>, since: number) =>
    reads.every(([j]) => [...reach[j]].every((s) => changedAt[s] <= since));

  const cRuns = new Array(C).fill(0);
  const cLast: Array<
    { reads: Array<[number, number]>; epoch: number } | undefined
  > = new Array(C);
  for (let i = 0; i < C; i++) {
    const spec = specs[i];
    getters.push(
      computed(() => {
        cRuns[i]++;
        const prev = cLast[i];
        T(
          `eval c${i}(n${S + i}) prev=${JSON.stringify(prev)} shadow=${JSON.stringify(shadow)}`,
        );
        // Only once watch-all exists: before that a computed can lose its last
        // subscriber, drop its deps, and legitimately recompute on the next read.
        if (watchingAll && prev !== undefined && quiet(prev.reads, prev.epoch))
          errors.push(`${ctx}: spurious recompute of c${i}`);
        const reads: Array<[number, number]> = [];
        const v = evalSpec(spec, (j) => {
          const x = getters[j]();
          reads.push([j, x]);
          return x;
        });
        cLast[i] = { reads, epoch };
        return v;
      }),
    );
  }

  // Bookkeeping shared by all effects.
  const stack: number[] = []; // effects currently mid-run (top = writer of record)
  const eRuns = new Array(E).fill(0);
  const eWrites = new Array(E).fill(0); // effective (value-changing) writes per effect
  const last: Array<LastRun | undefined> = new Array(E);
  const ownNow: Array<Set<number>> = Array.from({ length: E }, () => new Set());
  let thrownLog: unknown[] = [];
  let armed = false;

  // Writes from a child effect count as another effect's, not the parent's.
  const childWroteNow: boolean[] = new Array(E).fill(false);
  let childDepth = 0;
  let childWrites = 0;
  const write = (i: number, v: number) => {
    const k = childDepth ? undefined : stack[stack.length - 1];
    if (childDepth && shadow[i] !== v) {
      childWrites++;
      childWroteNow[stack[stack.length - 1]] = true;
    }
    if (shadow[i] !== v) {
      changedAt[i] = ++epoch;
      if (k !== undefined) {
        eWrites[k]++;
        ownNow[k].add(i);
      }
    }
    T(`write s${i}=${v} by ${k === undefined ? "ext" : "e" + k}`);
    shadow[i] = v;
    signals[i](v);
  };

  const makeEffect = (k: number, es: EffSpec) =>
    effect(() => {
      // No spurious runs: something upstream changed, or its last run wrote
      // (it re-runs once after its own writes, even if it re-read them).
      const prev = last[k];
      const staleRead =
        prev && [...new Map(prev.reads)].some(([j, v]) => v !== oracle(j));
      if (
        prev &&
        quiet(prev.reads, prev.epoch) &&
        !staleRead &&
        !prev.childWrote &&
        prev.own.size === 0
      )
        errors.push(
          `${ctx}: e${k} re-ran with nothing changed ${JSON.stringify(prev.lastSeen)}`,
        );
      eRuns[k]++;
      T(
        `run e${k} prev=${JSON.stringify(prev?.lastSeen)} shadow=${JSON.stringify(shadow)}`,
      );
      stack.push(k);
      let runThrew = false;
      childWroteNow[k] = false;
      ownNow[k] = new Set();
      const reads: Array<[number, number]> = [];
      const rd = (j: number) => {
        const x = getters[j]();
        // Glitch-free: matches a from-scratch recompute of the current signals.
        if (x !== oracle(j))
          errors.push(`${ctx}: e${k} read n${j}=${x}, oracle ${oracle(j)}`);
        reads.push([j, x]);
        return x;
      };
      try {
        const first = evalSpec(es.spec, rd);
        const w = es.w;
        if (w && rd(w.cond) < w.k) {
          const { t, k: target } = w;
          if (w.mode === "direct") {
            if (rd(t) < target) write(t, target);
          } else if (w.mode === "untracked") {
            untracked(() => {
              if (signals[t]() < target) write(t, target);
            });
          } else {
            // Child effect with no deps: runs once, inside this run.
            effect(() => {
              childDepth++;
              try {
                if (untracked(signals[t]) < target) write(t, target);
              } finally {
                childDepth--;
              }
            });
          }
          if (w.after !== undefined) rd(w.after);
        }
        if (es.throws && armed && first === 2) {
          runThrew = true;
          const err = new Error(`${ctx}: boom e${k}#${eRuns[k]}`);
          thrownLog.push(err);
          throw err;
        }
      } finally {
        stack.pop();
        // What it last saw: each dep's value once the run ends.
        last[k] = {
          reads,
          lastSeen: reads.map(([j]) => [j, oracle(j)]),
          own: ownNow[k],
          epoch,
          threw: runThrew,
          childWrote: childWroteNow[k],
        };
      }
    });

  const stops: Array<(() => void) | undefined> = [];
  for (let k = 0; k < E; k++) stops.push(makeEffect(k, effSpecs[k]));
  if (mode === "watched") {
    stops.push(
      effect(() => {
        for (let i = S; i < S + C; i++) {
          const x = getters[i]();
          if (x !== oracle(i))
            errors.push(
              `${ctx}: watch-all read n${i}=${x}, oracle ${oracle(i)}`,
            );
        }
      }),
    );
  }
  watchingAll = mode === "watched";
  armed = true;
  expect(errors, ctx).toEqual([]);

  // One externally-triggered flush: `call` performs the writes.
  const settle = (label: string, call: () => void) => {
    const runsBefore = eRuns.slice();
    const childWritesBefore = childWrites;
    const writesBefore = eWrites.slice();
    const cBefore = cRuns.slice();
    thrownLog = [];
    let caught: unknown = undefined;
    let threw = false;
    try {
      call();
    } catch (e) {
      threw = true;
      caught = e;
    }
    const at = `${ctx} ${label}`;
    // (1) settles without throwing.
    expect(threw ? String(caught) : "no throw", at).toBe("no throw");
    expect(errors, at).toEqual([]);
    // (2) every computed equals a from-scratch recompute.
    for (let i = 0; i < C; i++)
      expect(untracked(getters[S + i]), `${at}: c${i}`).toBe(oracle(S + i));
    const totalWrites =
      eWrites.reduce((a, b, k) => a + b - writesBefore[k], 0) + childWrites - childWritesBefore;
    for (let k = 0; k < E; k++) {
      const lr = last[k];
      if (stops[k] === undefined || lr === undefined) continue;
      // (4) after settling, the lastSeen equals current values (nothing owed)...
      for (const [j, v] of lr.lastSeen)
        expect(
          v,
          `${at}: e${k} stale on n${j} (lastSeen ${v}, now ${oracle(j)})`,
        ).toBe(oracle(j));
      // ...and last-read values do too: own writes re-run it until it sees
      // them. A node read twice in one run counts by its last read.
      for (const [j, v] of new Map(lr.reads)) {
        if (v === oracle(j) || lr.threw) continue;
        strict.push(
          `${at}: e${k} read n${j}=${v}, now ${oracle(j)} (own writes s${[...lr.own]})`,
        );
      }
      // (5) bounded runs: one for the external step, one per other-effect write,
      // one per own write that changed a computed it read.
      const others = totalWrites - (eWrites[k] - writesBefore[k]);
      const own = eWrites[k] - writesBefore[k];
      expect(eRuns[k] - runsBefore[k], `${at}: e${k} runs`).toBeLessThanOrEqual(
        1 + others + own,
      );
    }
    // Lazy computeds lose their deps when the last reader drops them, so each
    // effect run (and the final-value read) may recompute them once more.
    const effRuns = eRuns.reduce((a, b, k) => a + b - runsBefore[k], 0);
    const cBound = 1 + totalWrites + (mode === "lazy" ? effRuns : 0);
    for (let i = 0; i < C; i++)
      expect(cRuns[i] - cBefore[i], `${at}: c${i} runs`).toBeLessThanOrEqual(
        cBound,
      );
  };

  for (let step = 0; step < STEPS; step++) {
    const roll = r();
    if (roll < 0.08) {
      const k = pick(E);
      stops[k]?.();
      stops[k] = undefined;
      continue;
    }
    const n = 1 + pick(3);
    const writes: Array<[number, number]> = [];
    for (let w = 0; w < n; w++) writes.push([pick(S), pick(3)]);
    const label = `step ${step} ${JSON.stringify(writes)}`;
    if (roll < 0.55) {
      settle(`${label} batched`, () =>
        batch(() => writes.forEach(([i, v]) => write(i, v))),
      );
    } else {
      for (const [i, v] of writes)
        settle(`${label} single ${i}=${v}`, () => write(i, v));
    }
  }
  for (const s of stops) s?.();
  return strict;
}

describe("fuzz: writing effects", { timeout: 60_000 }, () => {
  it("random graphs, watched computeds, seeds 7001..7120", () => {
    for (let seed = 7001; seed <= 7120; seed++)
      expect(runWriteCase(seed, "watched", false)).toEqual([]);
  });
  it("random graphs, lazy computeds, seeds 7201..7320", () => {
    for (let seed = 7201; seed <= 7320; seed++)
      expect(runWriteCase(seed, "lazy", false)).toEqual([]);
  });
});
