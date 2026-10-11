/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
// SSR↔client parity property test: for randomized component trees, the
// server render must hydrate with zero mismatches and yield a DOM
// equivalent to a pure client render of the same tree. Seeded PRNG —
// failures print their seed for exact reproduction.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "./jsx-runtime/element";
import { Fragment } from "./jsx-runtime/fragment";
import { For } from "./for";
import { renderToString } from "./server";
import { hydrate } from "./hydrate";
import { render } from "./render";
import { signal } from "./signals";

// ─ Seeded PRNG (LCG) ──────────────────────────────────────────────────────────

function lcg(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// ─ Tree generator ─────────────────────────────────────────────────────────────
// A spec is a plain-data tree; `build(spec)` constructs fresh JSX (fresh
// signals) so the same spec renders identically on "server" and "client".

type Spec =
  | { kind: "text"; value: string }
  | { kind: "dynamic"; value: string } // () => value child
  | { kind: "signal"; value: string } // signal child
  | { kind: "el"; tag: string; attrs: Record<string, string>; toggles: string[];  children: Spec[] }
  | { kind: "frag"; children: Spec[] }
  | { kind: "html"; markup: string }
  | { kind: "cond"; on: boolean; branch: Spec }
  | { kind: "for"; rows: string[] };

// Tags that parse without HTML auto-closing surprises (no p/ul/table).
const TAGS = ["div", "span", "section", "b", "em"];
const WORDS = ["alpha", "beta", "gamma d'or", "x<y&z", 'quo"te', "0", " pad "];

function genSpec(rnd: () => number, depth: number): Spec {
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]!;
  const roll = rnd();
  if (depth <= 0 || roll < 0.25) return { kind: "text", value: pick(WORDS) };
  if (roll < 0.35) return { kind: "dynamic", value: pick(WORDS) };
  if (roll < 0.42) return { kind: "signal", value: pick(WORDS) };
  if (roll < 0.46) {
    return { kind: "html", markup: `<b>${Math.floor(rnd() * 100)}</b> raw` };
  }
  if (roll < 0.5) {
    return { kind: "cond", on: rnd() < 0.5, branch: genSpec(rnd, depth - 1) };
  }
  if (roll < 0.58) {
    return {
      kind: "for",
      rows: Array.from({ length: Math.floor(rnd() * 4) }, (_, i) => `row-${i}-${Math.floor(rnd() * 10)}`),
    };
  }
  if (roll < 0.68) {
    return {
      kind: "frag",
      children: Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => genSpec(rnd, depth - 1)),
    };
  }
  const attrs: Record<string, string> = {};
  if (rnd() < 0.6) attrs.title = pick(WORDS);
  if (rnd() < 0.4) attrs["data-x"] = pick(WORDS);
  // Bare `class` alongside `class:` toggles — the server merges both into one
  // attribute, so the client must not clobber the toggles.
  if (rnd() < 0.4) attrs.class = pick(["w-full", "base pad", "x-input"]);
  return {
    kind: "el",
    tag: pick(TAGS),
    attrs,
    toggles: rnd() < 0.3 ? ["active"] : [],
    children: Array.from({ length: Math.floor(rnd() * 4) }, () => genSpec(rnd, depth - 1)),
  };
}

function build(spec: Spec): unknown {
  switch (spec.kind) {
    case "text":
      return spec.value;
    case "dynamic": {
      const v = spec.value;
      return () => v;
    }
    case "signal":
      return signal(spec.value);
    case "html":
      return createElement(Fragment as never, {
        html: true,
        children: spec.markup,
      } as never);
    case "cond": {
      // Signal-driven conditional: same branch on both sides, live region.
      const on = signal(spec.on);
      const branch = spec.branch;
      return () => (on() ? build(branch) : null);
    }
    case "for": {
      const rows = signal(spec.rows.map((label, i) => ({ id: i, label })));
      return createElement(For as never, {
        each: rows,
        by: (r: { id: number }) => r.id,
        children: (r: { label: string }) =>
          createElement("div", { children: r.label }),
      } as never);
    }
    case "frag":
      return createElement(Fragment as never, {
        children: spec.children.map(build),
      } as never);
    case "el": {
      // Toggles first, so `class:*` precedes a bare `class` — the order in
      // which a naive className assignment would drop the toggles.
      const props: Record<string, unknown> = {};
      for (const t of spec.toggles) props[`class:${t}`] = true;
      Object.assign(props, spec.attrs);
      props.children = spec.children.map(build);
      return createElement(spec.tag, props as never);
    }
  }
}

// ─ Property ───────────────────────────────────────────────────────────────────

describe("SSR↔client parity (property)", () => {
  for (let seed = 1; seed <= 30; seed++) {
    it(`seed ${seed}: hydrates without mismatch, DOM-equivalent to client render`, async () => {
      const rnd = lcg(seed * 7919);
      const spec: Spec = {
        kind: "el",
        tag: "div",
        attrs: {},
        toggles: [],
        children: Array.from({ length: 2 + Math.floor(rnd() * 3) }, () =>
          genSpec(rnd, 3),
        ),
      };

      // Pure client render.
      const clientHost = document.createElement("div");
      render(clientHost, () => build(spec) as Node);

      // Server render → hydrate.
      const html = await renderToString(() => build(spec));
      const container = document.createElement("div");
      container.innerHTML = html;
      const onMismatch = vi.fn();
      hydrate(container, () => build(spec), { onMismatch });

      expect(
        onMismatch.mock.calls.map((c) => c[0]),
        `seed ${seed} mismatches`,
      ).toEqual([]);
      expect(
        container.isEqualNode(clientHost),
        `seed ${seed}\nSSR+hydrate: ${container.innerHTML}\nclient:      ${clientHost.innerHTML}`,
      ).toBe(true);
    });
  }
});
