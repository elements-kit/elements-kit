import { bench, describe } from "vitest";
import { effectScope } from "@/signals/index.ts";
import { onMount } from "./on-mount.ts";

// Microtask + small timeout drains happy-dom's MutationObserver queue.
async function flushMO() {
  await new Promise((r) => setTimeout(r, 0));
  await Promise.resolve();
}

function freshDocBody(): void {
  document.body.innerHTML = "";
}

describe("onMount — registration cost", () => {
  bench(
    "register 100 entries on already-connected elements",
    async () => {
      freshDocBody();
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

describe("onMount — flush scan cost (per MO callback)", () => {
  for (const N of [10, 100, 1000, 10000]) {
    bench(
      `flush across ${N} entries on the same root`,
      async () => {
        freshDocBody();
        const stops: Array<() => void> = [];
        const els: HTMLElement[] = [];
        for (let i = 0; i < N; i++) {
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

        // Trigger one MO callback by mutating doc-level childList. Every
        // entry on doc gets isConnected-checked during the resulting flush.
        const probe = document.createElement("span");
        document.body.appendChild(probe);
        await flushMO();
        probe.remove();
        await flushMO();

        for (const s of stops) s();
      },
      { iterations: N >= 10000 ? 3 : 20 },
    );
  }
});

describe("onMount — connect/disconnect cycle", () => {
  bench(
    "register → append → remove → append (single entry)",
    async () => {
      freshDocBody();
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

describe("onMount — orphan sweep", () => {
  bench(
    "sweep with 100 orphans, one reconnects",
    async () => {
      freshDocBody();
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

      // Disconnect all → 100 orphans.
      for (const el of els) el.remove();
      await flushMO();

      // Reattach one — sweep walks all 100 to find it.
      document.body.appendChild(els[0]);
      await flushMO();

      for (const s of stops) s();
    },
    { iterations: 20 },
  );
});
