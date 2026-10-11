import { bench, describe } from "vitest";
import { DomLifecycleElement } from "./dom-lifecycle.ts";

// ─ 1. Registration cost ────────────────────────────────────────────────────
// Per-call cost of attaching a `<dom-lifecycle>` probe to an already-connected
// element (createElement + property assign + appendChild → connectedCallback).

describe("dom-lifecycle — registration cost", () => {
  bench(
    "register 100 entries on already-connected elements",
    () => {
      document.body.innerHTML = "";
      for (let i = 0; i < 100; i++) {
        const el = document.createElement("div");
        document.body.appendChild(el);
        const probe = document.createElement(
          "dom-lifecycle",
        ) as DomLifecycleElement;
        probe.onConnect = () => {};
        el.appendChild(probe);
      }
    },
    { iterations: 50 },
  );
});

// ─ 2. Connect/disconnect cycle over N pre-staged entries ──────────────────
// Pre-build a wrapper containing N elements each with a `<dom-lifecycle>`
// probe. Each iteration appends and removes the wrapper — connecting and
// disconnecting all N probes synchronously. Setup is amortized away.

describe("dom-lifecycle — connect+disconnect cycle over N pre-staged entries", () => {
  for (const N of [10, 100, 1000, 10000]) {
    let wrapper: HTMLElement;

    bench(
      `cycle ${N} entries`,
      () => {
        document.body.appendChild(wrapper);
        wrapper.remove();
      },
      {
        iterations: N >= 10000 ? 30 : 50,
        setup: () => {
          document.body.innerHTML = "";
          wrapper = document.createElement("div");
          for (let i = 0; i < N; i++) {
            const el = document.createElement("div");
            wrapper.appendChild(el);
            const probe = document.createElement(
              "dom-lifecycle",
            ) as DomLifecycleElement;
            probe.onConnect = () => {};
            probe.onDisconnect = () => {};
            el.appendChild(probe);
          }
        },
        teardown: () => {
          document.body.innerHTML = "";
        },
      },
    );
  }
});

// ─ 3. Probe-only mutation while N unrelated entries exist ─────────────────
// One-element mutation while N unrelated `<dom-lifecycle>` probes sit on the
// page. Should be O(1) regardless of N — native CE callbacks dispatch only
// to mutated elements, no global registry walk.

describe("dom-lifecycle — single mutation, N inert page entries", () => {
  for (const N of [0, 100, 1000, 10000]) {
    let probe: HTMLElement;

    bench(
      `single mutation with ${N} other entries`,
      () => {
        document.body.appendChild(probe);
        probe.remove();
      },
      {
        iterations: 50,
        setup: () => {
          document.body.innerHTML = "";
          for (let i = 0; i < N; i++) {
            const el = document.createElement("div");
            document.body.appendChild(el);
            const p = document.createElement(
              "dom-lifecycle",
            ) as DomLifecycleElement;
            p.onConnect = () => {};
            el.appendChild(p);
          }
          probe = document.createElement("span");
        },
        teardown: () => {
          document.body.innerHTML = "";
        },
      },
    );
  }
});

// ─ 4. Connect/disconnect of a single entry ────────────────────────────────

describe("dom-lifecycle — single-entry connect/disconnect cycle", () => {
  bench(
    "create → append → remove → append (single entry)",
    () => {
      document.body.innerHTML = "";
      const el = document.createElement("div");
      const probe = document.createElement(
        "dom-lifecycle",
      ) as DomLifecycleElement;
      probe.onConnect = () => {};
      probe.onDisconnect = () => {};
      el.appendChild(probe);
      document.body.appendChild(el);
      el.remove();
      document.body.appendChild(el);
    },
    { iterations: 50 },
  );
});
