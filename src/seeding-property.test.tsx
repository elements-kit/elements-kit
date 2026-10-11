/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
// Seeding-alignment property: async values at randomized positions must
// each seed from *their own* ek-data record after hydration — document-order
// id assignment (server emit) must match walk-order consumption (claim).
import { describe, it, expect } from "vitest";
import { createElement } from "./jsx-runtime/element";
import { renderToString } from "./server";
import { hydrate } from "./hydrate";
import { promise, type ComputedPromise } from "./utilities/promise";

function lcg(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

type PSpec =
  | { kind: "p"; idx: number }
  | { kind: "t"; value: string }
  | { kind: "el"; tag: string; children: PSpec[] };

function genSpec(rnd: () => number, depth: number, slots: number[]): PSpec {
  const roll = rnd();
  if (depth <= 0 || roll < 0.3) {
    return { kind: "t", value: `t${Math.floor(rnd() * 100)}` };
  }
  if (roll < 0.55 && slots.length > 0) {
    return { kind: "p", idx: slots.shift()! };
  }
  return {
    kind: "el",
    tag: rnd() < 0.5 ? "div" : "span",
    children: Array.from({ length: 1 + Math.floor(rnd() * 3) }, () =>
      genSpec(rnd, depth - 1, slots),
    ),
  };
}

function build(
  spec: PSpec,
  makeAsync: (idx: number) => unknown,
): unknown {
  switch (spec.kind) {
    case "t":
      return spec.value;
    case "p":
      return makeAsync(spec.idx);
    case "el":
      return createElement(spec.tag, {
        children: spec.children.map((c) => build(c, makeAsync)),
      } as never);
  }
}

describe("ek-data seeding alignment (property)", () => {
  for (let seed = 1; seed <= 15; seed++) {
    it(`seed ${seed}: every pending value seeds from its own record`, async () => {
      const rnd = lcg(seed * 104729);
      const count = 2 + Math.floor(rnd() * 4);
      const slots = Array.from({ length: count }, (_, i) => i);
      const spec: PSpec = {
        kind: "el",
        tag: "main",
        children: [
          genSpec(rnd, 3, slots),
          genSpec(rnd, 3, slots),
          genSpec(rnd, 3, slots),
        ],
      };
      // Slots not placed by the generator get appended flat at the end so
      // every index exists exactly once.
      while (slots.length > 0) {
        spec.children.push({ kind: "p", idx: slots.shift()! });
      }

      // Server: each async slot resolves to its labeled value.
      const html = await renderToString(() =>
        build(spec, (idx) => promise(Promise.resolve(`value-${idx}`))),
      );
      const container = document.createElement("div");
      container.innerHTML = html;

      // Client: same structure, all pending; capture the instances.
      const instances: ComputedPromise<string, unknown>[] = [];
      hydrate(container, () =>
        build(spec, (idx) => {
          const p = promise<string>(new Promise<string>(() => {}));
          instances[idx] = p;
          return p;
        }),
      );

      for (const [idx, p] of instances.entries()) {
        expect(p.state, `seed ${seed} slot ${idx}`).toBe("fulfilled");
        expect(p.value, `seed ${seed} slot ${idx}`).toBe(`value-${idx}`);
      }
    });
  }
});
