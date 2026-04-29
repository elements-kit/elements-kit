import { bench, describe } from "vitest";
import { effectScope } from "@/signals/index.ts";
import { onMount } from "./on-mount.ts";

// Microtask + small timeout drains happy-dom's MutationObserver queue.
async function flushMO() {
  await new Promise((r) => setTimeout(r, 0));
  await Promise.resolve();
}

// ─ 1. Registration cost ────────────────────────────────────────────────────
// Measures the per-call cost of `onMount` itself (signal + Entry alloc,
// indexAdd, ensureObserver lookup). Setup/teardown is part of the iteration
// because the cost we care about IS the registration.

describe("onMount — registration cost", () => {
  bench(
    "register 100 entries on already-connected elements",
    async () => {
      document.body.innerHTML = "";
      const stops: Array<() => void> = [];
      for (let i = 0; i < 100; i++) {
        const el = document.createElement("div");
        document.body.appendChild(el);
        stops.push(
          effectScope(() => {
            onMount(el, () => {});
          }),
        );
      }
      await flushMO();
      for (const s of stops) s();
    },
    { iterations: 50 },
  );
});

// ─ 2. Isolated flush cost ──────────────────────────────────────────────────
// Pre-build N entries OUTSIDE the timed region. Each iteration appends a
// pre-built wrapper (connecting all N at once → triggers a flush walking N
// elements), then detaches it (disconnecting all N → another flush walking
// N elements). Setup cost is amortized away.
//
// This is the right shape to see how flush cost scales with entry count —
// the previous bench was dominated by createElement / dispose noise.

describe("onMount — connect+disconnect flush over N pre-staged entries", () => {
  for (const N of [10, 100, 1000, 10000]) {
    let wrapper: HTMLElement;
    let stops: Array<() => void> = [];

    bench(
      `cycle ${N} entries`,
      async () => {
        document.body.appendChild(wrapper);
        await flushMO();
        wrapper.remove();
        await flushMO();
      },
      {
        iterations: N >= 10000 ? 30 : 50,
        setup: () => {
          document.body.innerHTML = "";
          for (const s of stops) s();
          stops = [];
          wrapper = document.createElement("div");
          for (let i = 0; i < N; i++) {
            const el = document.createElement("div");
            wrapper.appendChild(el);
            stops.push(
              effectScope(() => {
                onMount(el, () => {});
              }),
            );
          }
        },
        teardown: () => {
          for (const s of stops) s();
          stops = [];
          document.body.innerHTML = "";
        },
      },
    );
  }
});

// ─ 3. Probe flush with N inert entries on the page ────────────────────────
// One-element mutation while N unrelated entries exist. With element-indexed
// flush, this should be O(1) regardless of N — the probe doesn't match any
// entry, so the walk's reactToAdded/Removed find nothing. Verifies the
// "scales with mutation size, not page entry count" claim.

describe("onMount — probe flush, N inert page entries", () => {
  for (const N of [0, 100, 1000, 10000]) {
    let probe: HTMLElement;
    let stops: Array<() => void> = [];

    bench(
      `probe flush with ${N} other entries`,
      async () => {
        document.body.appendChild(probe);
        await flushMO();
        probe.remove();
        await flushMO();
      },
      {
        iterations: 50,
        setup: () => {
          document.body.innerHTML = "";
          for (const s of stops) s();
          stops = [];
          for (let i = 0; i < N; i++) {
            const el = document.createElement("div");
            document.body.appendChild(el);
            stops.push(
              effectScope(() => {
                onMount(el, () => {});
              }),
            );
          }
          probe = document.createElement("span");
        },
        teardown: () => {
          for (const s of stops) s();
          stops = [];
          document.body.innerHTML = "";
        },
      },
    );
  }
});

// ─ 4. Connect/disconnect of a single entry ───────────────────────────────

describe("onMount — single-entry connect/disconnect cycle", () => {
  bench(
    "register → append → remove → append (single entry)",
    async () => {
      document.body.innerHTML = "";
      const el = document.createElement("div");
      const stop = effectScope(() => {
        onMount(el, () => {});
      });
      document.body.appendChild(el);
      await flushMO();
      el.remove();
      await flushMO();
      document.body.appendChild(el);
      await flushMO();
      stop();
    },
    { iterations: 50 },
  );
});

// ─ 5. Orphan sweep ─────────────────────────────────────────────────────────

describe("onMount — orphan sweep", () => {
  bench(
    "sweep with 100 orphans, one reconnects",
    async () => {
      document.body.innerHTML = "";
      const stops: Array<() => void> = [];
      const els: HTMLElement[] = [];
      for (let i = 0; i < 100; i++) {
        const el = document.createElement("div");
        document.body.appendChild(el);
        els.push(el);
        stops.push(
          effectScope(() => {
            onMount(el, () => {});
          }),
        );
      }
      await flushMO();

      for (const el of els) el.remove();
      await flushMO();

      document.body.appendChild(els[0]);
      await flushMO();

      for (const s of stops) s();
    },
    { iterations: 20 },
  );
});
