import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "./toolbar.css";

// The --scroll-y path: what Firefox runs (no scroll-driven animations). Also runs in Chromium and
// WebKit with animations switched off, so every engine agrees on the fallback math.

document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

let host: HTMLElement | undefined;
const off = document.createElement("style");
off.textContent = "*, *::before { animation: none !important; }";

afterEach(() => {
  host?.remove();
  host = undefined;
  off.remove();
});

function mount(html: string): HTMLElement {
  document.head.append(off);
  host = document.createElement("div");
  host.style.cssText = "block-size: 560px; inline-size: 390px; overflow: auto";
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

const rows = (count = 40) => `<div>${"<p style='block-size: 48px; margin: 0'>Row</p>".repeat(count)}</div>`;
const q = (root: ParentNode, selector: string) => root.querySelector(selector) as HTMLElement;
const opacity = (el: Element, pseudo?: string) => Number(getComputedStyle(el, pseudo).opacity);
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const write = (y: number, ...targets: HTMLElement[]) => {
  for (const target of targets) target.style.setProperty("--scroll-y", `${y}px`);
};

describe("x-toolbar --scroll-y", () => {
  it.each([
    ["bar first", `<header class="x-toolbar"><span data-title>Inbox</span></header><h1 class="x-large-title">Inbox</h1>`, [[0, 1, 0], [24, 0.5, 0], [38, 0.208, 0.479], [48, 0, 1]]],
    ["title first", `<h1 class="x-large-title">Settings</h1><header class="x-toolbar"><span data-title>Settings</span></header>`, [[0, 1, 0], [28, 0.5, 0], [45, 0.196, 0.509], [56, 0, 1]]],
  ] as const)("%s: fades the title and reveals the bar over the same ranges", (_, html, expected) => {
    const el = mount(`${html}${rows()}`);
    const title = q(el, ".x-large-title");
    const bar = q(el, ".x-toolbar");
    for (const [y, titleOpacity, barOpacity] of expected) {
      write(y, title, bar);
      expect(opacity(title), `title at ${y}`).toBeCloseTo(titleOpacity, 2);
      expect(opacity(bar, "::before"), `bar background at ${y}`).toBeCloseTo(barOpacity, 2);
    }
  });

  it("before a script runs (a server-rendered page), the screen reads as the top", async () => {
    const el = mount(`<header class="x-toolbar"><div></div><span data-title>Inbox</span><div></div></header><h1 class="x-large-title">Inbox</h1>${rows()}`);
    await frame();

    expect(opacity(q(el, "header"), "::before")).toBe(0);
    expect(opacity(q(el, "[data-title]"))).toBe(0);
    expect(opacity(q(el, ".x-large-title"))).toBe(1);
  });

  it("a script's value takes over the default", async () => {
    const el = mount(`<header class="x-toolbar"><div></div><span data-title>Inbox</span><div></div></header><h1 class="x-large-title">Inbox</h1>${rows()}`);
    write(200, q(el, "header"), q(el, ".x-large-title"));
    await frame();

    expect(opacity(q(el, "header"), "::before")).toBe(1);
    expect(opacity(q(el, "[data-title]"))).toBe(1);
    expect(opacity(q(el, ".x-large-title"))).toBe(0);
  });

  it("no large title: the background appears once content scrolls under the bar", async () => {
    const el = mount(`<header class="x-toolbar"><span data-title>Policy</span></header>${rows()}`);
    const bar = q(el, "header");
    await frame();
    expect(opacity(bar, "::before")).toBe(0);
    expect(opacity(q(el, "[data-title]"))).toBe(1);

    write(40, bar);
    await frame();
    expect(opacity(bar, "::before")).toBe(1);
  });

  it("grouped rows follow their group", async () => {
    const el = mount(
      `<header class="x-toolbar"><div class="x-toolbar"><span data-title>Recents</span></div><div class="x-toolbar"><span>Search</span></div></header><h1 class="x-large-title">Recents</h1>${rows()}`,
    );
    const group = q(el, "header");
    write(200, group, q(el, ".x-large-title"));
    await frame();

    expect(opacity(q(el, "[data-title]"))).toBe(1);
  });
});

describe("x-toolbar --scroll-y-end (bottom bar)", () => {
  const end = (px: number, bar: HTMLElement) => bar.style.setProperty("--scroll-y-end", `${px}px`);

  it("without a script: shown where there are no scroll timelines, else resting clear", async () => {
    const el = mount(`${rows()}<footer class="x-toolbar" data-position="bottom"><div><button>OK</button></div></footer>`);
    await frame();
    // with timelines, --scroll-y-end rests at 0 until the timeline runs (off here)
    expect(opacity(q(el, "footer"), "::before")).toBe(CSS.supports("animation-timeline: view()") ? 0 : 1);
  });

  it("a script's --scroll-y-end fades it over the last 8px, clear at the end", async () => {
    const el = mount(`${rows()}<footer class="x-toolbar" data-position="bottom"><div><button>OK</button></div></footer>`);
    const bar = q(el, "footer");
    for (const [px, expected] of [[200, 1], [8, 1], [6, 0.375], [4, 0], [0, 0]] as const) {
      end(px, bar);
      await frame();
      expect(opacity(bar, "::before"), `${px}px left`).toBeCloseTo(expected, 2);
    }
  });

  it('data-reveal="always" keeps it shown at the end', async () => {
    const el = mount(`${rows()}<footer class="x-toolbar" data-position="bottom" data-reveal="always"><div><button>OK</button></div></footer>`);
    end(0, q(el, "footer"));
    await frame();
    expect(opacity(q(el, "footer"), "::before")).toBe(1);
  });
});

describe("x-toolbar data-reveal", () => {
  it('"always": the background and a bar title under a large title show at the top, and stay', async () => {
    const el = mount(`<header class="x-toolbar" data-reveal="always"><div></div><span data-title>Inbox</span><div></div></header><h1 class="x-large-title">Inbox</h1>${rows()}`);
    await frame();
    expect(opacity(q(el, "header"), "::before")).toBe(1);
    expect(opacity(q(el, "[data-title]"))).toBe(1);

    write(200, q(el, "header"), q(el, ".x-large-title"));
    await frame();
    expect(opacity(q(el, "header"), "::before")).toBe(1);
  });
});
