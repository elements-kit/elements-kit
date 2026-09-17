import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "../button/button.css";
import "../group/group.css";
import "../segmented-control/segmented-control.css";
import "../text-input/text-input.css";
import "./toolbar.css";

// Real Chromium: the toolbar is layout + scroll math, so these assert geometry and computed styles.

// color context on the root, like an app: tokens declared on :root resolve against it
document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

/** A 390×560 scroll container holding `html`. */
function mount(html: string): HTMLElement {
  host = document.createElement("div");
  host.style.cssText = "block-size: 560px; inline-size: 390px; overflow: auto";
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

const rows = (count = 40) =>
  `<div>${"<p style='block-size: 48px; margin: 0'>Row</p>".repeat(count)}</div>`;

const button = (label: string) =>
  `<button class="unset x-button" data-variant="text" data-size="2">${label}</button>`;

const q = (root: ParentNode, selector: string) =>
  root.querySelector(selector) as HTMLElement;

const box = (el: Element) => el.getBoundingClientRect();
const centerX = (el: Element) => (box(el).left + box(el).right) / 2;
const opacity = (el: Element, pseudo?: string) =>
  Number(getComputedStyle(el, pseudo).opacity);

/**
 * Scroll for real and write --scroll-y as the scroll wiring does, so both paths agree: scroll-driven
 * animations where supported, the --scroll-y math elsewhere.
 */
const setScroll = async (el: HTMLElement, y: number) => {
  el.scrollTop = y;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  el.style.setProperty("--scroll-y", `${el.scrollTop}px`);
  await new Promise((r) => requestAnimationFrame(r));
  return el.scrollTop;
};

describe("x-toolbar regions", () => {
  it("places children start | center | end, with the title centered on the bar", () => {
    const el = mount(`
      <header class="x-toolbar">${button("Back")}<span data-title>Inbox</span>${button("Edit")}</header>
      ${rows()}`);
    const bar = q(el, ".x-toolbar");
    const [back, edit] = bar.querySelectorAll(".x-button");
    const title = q(bar, "[data-title]");

    expect(Math.abs(centerX(title) - centerX(bar))).toBeLessThanOrEqual(1);
    expect(box(back).right).toBeLessThanOrEqual(box(title).left);
    expect(box(edit).left).toBeGreaterThanOrEqual(box(title).right);
  });

  it("with only start and end, start takes the free space (title next to back)", () => {
    const el = mount(`
      <header class="x-toolbar">
        <div>${button("Back")}<span data-title>Design Team</span></div>
        <div>${button("More")}</div>
      </header>`);
    const bar = q(el, ".x-toolbar");
    const [start, end] = bar.children;

    expect(box(start).left - box(bar).left).toBeCloseTo(16, 0);
    expect(box(bar).right - box(end).right).toBeCloseTo(16, 0);
  });

  it("centers a lone child", () => {
    const el = mount(`<header class="x-toolbar"><div>${button("Pen")}${button("Text")}</div></header>`);
    const bar = q(el, ".x-toolbar");

    expect(Math.abs(centerX(bar.firstElementChild!) - centerX(bar))).toBeLessThanOrEqual(1);
  });

  it("stretches a region holding an input across the bar", () => {
    const el = mount(`
      <header class="x-toolbar">
        <div class="x-text-input" data-size="2"><input class="unset" aria-label="Search" /></div>
      </header>`);
    const bar = q(el, ".x-toolbar");

    expect(box(bar.firstElementChild!).width).toBeCloseTo(box(bar).width - 32, 0);
  });

  it("truncates a long title and keeps the buttons whole", () => {
    const el = mount(`
      <header class="x-toolbar">
        ${button("Back")}<span data-title>${"Notifications and Privacy Preferences ".repeat(3)}</span>${button("Edit")}
      </header>`);
    const bar = q(el, ".x-toolbar");
    const title = q(bar, "[data-title]");
    const edit = bar.lastElementChild!;

    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    expect(box(title).right).toBeLessThanOrEqual(box(edit).left);
    expect(box(edit).right).toBeLessThanOrEqual(box(bar).right);
  });
});

describe("x-toolbar large title collapse", () => {
  const screen = () =>
    mount(`
      <header class="x-toolbar"><span data-title>Settings</span></header>
      <h1 class="x-large-title">Settings</h1>
      ${rows()}`);

  it("sits right under the bar: one line plus bottom padding, 40 + 8 = 48px", () => {
    const el = screen();
    const title = q(el, ".x-large-title");

    expect(box(title).top).toBe(box(q(el, ".x-toolbar")).bottom);
    expect(box(title).height).toBe(48);
  });

  it("expanded: large title shown, bar background and bar title hidden", async () => {
    const el = screen();
    await setScroll(el, 0);
    const bar = q(el, ".x-toolbar");

    expect(opacity(q(el, ".x-large-title"))).toBe(1);
    expect(opacity(bar, "::before")).toBe(0);
    expect(opacity(q(bar, "[data-title]"))).toBe(0);
  });

  it("midway: the large title is half faded", async () => {
    const el = screen();
    await setScroll(el, 24);

    expect(opacity(q(el, ".x-large-title"))).toBeCloseTo(0.5, 2);
  });

  it("collapsed: large title gone, bar background and bar title shown", async () => {
    const el = screen();
    await setScroll(el, 48);
    const bar = q(el, ".x-toolbar");

    expect(opacity(q(el, ".x-large-title"))).toBe(0);
    expect(opacity(bar, "::before")).toBe(1);
    expect(opacity(q(bar, "[data-title]"))).toBe(1);
  });

  it("without JS: the title's view timeline drives the collapse; without view timelines, a plain bar and a static title", async () => {
    const el = screen();
    const bar = q(el, ".x-toolbar");
    const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await frames();

    const timelines = CSS.supports("animation-timeline: view()");
    expect(opacity(q(el, ".x-large-title"))).toBe(1);
    expect(opacity(bar, "::before")).toBe(timelines ? 0 : 1);
    expect(opacity(q(bar, "[data-title]"))).toBe(timelines ? 0 : 1);
    if (timelines) {
      el.scrollTop = 24;
      await frames();
      expect(opacity(q(el, ".x-large-title")), "half faded by the scroll alone").toBeCloseTo(0.5, 2);
      el.scrollTop = 48;
      await frames();
      expect(opacity(q(el, ".x-large-title"))).toBe(0);
      expect(opacity(bar, "::before")).toBe(1);
      expect(opacity(q(bar, "[data-title]"))).toBe(1);
    }
  });

  it("doesn't snap (a touch fling keeps its momentum); the container stops focus below the bar", () => {
    const el = screen();
    const style = getComputedStyle(el);

    expect(style.scrollSnapType).toBe("none");
    expect(style.scrollPaddingTop).toBe("56px");
    expect(getComputedStyle(q(el, ".x-large-title")).scrollSnapAlign).toBe("none");
  });

  it("keeps the bar at the top while content scrolls", () => {
    const el = screen();
    el.scrollTop = 300;

    expect(box(q(el, ".x-toolbar")).top).toBeCloseTo(box(el).top, 0);
  });
});

describe("x-toolbar without a large title", () => {
  it("shows the title always and the background once content scrolls under", async () => {
    const el = mount(`<header class="x-toolbar"><span data-title>Chat</span></header>${rows()}`);
    const bar = q(el, ".x-toolbar");

    await setScroll(el, 0);
    expect(opacity(q(bar, "[data-title]"))).toBe(1);
    expect(opacity(bar, "::before")).toBe(0);

    await setScroll(el, 20);
    expect(opacity(bar, "::before")).toBe(1);
  });

  it("does not snap", () => {
    const el = mount(`<header class="x-toolbar"><span data-title>Chat</span></header>${rows()}`);

    expect(getComputedStyle(el).scrollSnapType).toBe("none");
  });
});

describe("x-toolbar after the large title", () => {
  const screen = () =>
    mount(`
      <h1 class="x-large-title">Settings</h1>
      <header class="x-toolbar">
        <div class="x-text-input" data-size="2"><input class="unset" aria-label="Search" /></div>
      </header>
      ${rows()}`);

  it("reveals its background over the title's collapse", async () => {
    const el = screen();
    const bar = q(el, ".x-toolbar");

    await setScroll(el, 0);
    expect(opacity(bar, "::before")).toBe(0);
    await setScroll(el, 64);
    expect(opacity(bar, "::before")).toBe(1);
  });

  it("pins at the top once the title has scrolled away", () => {
    const el = screen();
    el.scrollTop = 300;

    expect(box(q(el, ".x-toolbar")).top).toBeCloseTo(box(el).top, 0);
  });
});

describe("x-toolbar data-position=bottom", () => {
  const footer = `<footer class="x-toolbar" data-position="bottom">${button("Share")}</footer>`;

  it("sits at the bottom with short content", () => {
    const el = mount(`<div><p>One row</p></div>${footer}`);

    expect(box(q(el, "footer")).bottom).toBeCloseTo(box(el).bottom, 0);
  });

  it("stays at the bottom while long content scrolls", () => {
    const el = mount(`${rows()}${footer}`);
    el.scrollTop = 300;

    expect(box(q(el, "footer")).bottom).toBeCloseTo(box(el).bottom, 0);
  });

  it("always shows its background and stops focus above it", async () => {
    const el = mount(`${rows()}${footer}`);
    await setScroll(el, 0);

    expect(opacity(q(el, "footer"), "::before")).toBe(1);
    expect(getComputedStyle(el).scrollPaddingBottom).toBe("56px");
  });
});

describe("x-toolbar variants", () => {
  it("surface: 56px bar with a material background and hairline", () => {
    const el = mount(`<header class="x-toolbar"><span data-title>Title</span></header>${rows()}`);
    const bar = q(el, ".x-toolbar");

    expect(box(bar).height).toBe(56);
    expect(getComputedStyle(bar, "::before").boxShadow).not.toBe("none");
  });

  it("clean: 64px bar with no background", () => {
    const el = mount(`<header class="x-toolbar" data-variant="clean"><span data-title>Title</span></header>${rows()}`);
    const bar = q(el, ".x-toolbar");

    expect(box(bar).height).toBe(64);
    expect(getComputedStyle(bar, "::before").content).toBe("none");
    expect(getComputedStyle(el).scrollPaddingTop).toBe("64px");
  });

  it("soft: 64px bar with a gradient blur edge, flipped for the bottom bar", () => {
    const el = mount(`
      <header class="x-toolbar" data-variant="soft"><span data-title>Title</span></header>
      ${rows()}
      <footer class="x-toolbar" data-variant="soft" data-position="bottom">${button("Share")}</footer>`);
    const top = q(el, "header");
    const edge = getComputedStyle(top, "::before");

    expect(box(top).height).toBe(64);
    expect(edge.backdropFilter).toContain("blur");
    expect(edge.maskImage).toContain("gradient");
    expect(getComputedStyle(top).getPropertyValue("--x-toolbar-edge").trim()).toBe("to bottom");
    expect(getComputedStyle(q(el, "footer")).getPropertyValue("--x-toolbar-edge").trim()).toBe("to top");
  });
});

// Geometry for every scaling, size, variant, position and grouping: toolbar.geometry.browser.test.ts

describe("x-large-title scrolling (real scroll)", () => {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const field = (variant: string) =>
    variant === "surface"
      ? `<div class="x-text-input" data-size="2"><input class="unset" aria-label="Search" /></div>`
      : `<div class="x-group" data-variant="material"><div class="x-text-input" data-variant="soft" data-size="2"><input class="unset" aria-label="Search" /></div></div>`;

  const screens = {
    "title first": (variant: string) => `<h1 class="x-large-title">Settings</h1><header class="x-toolbar" data-variant="${variant}">${field(variant)}</header>${rows()}`,
    "bar first": (variant: string) => `<header class="x-toolbar" data-variant="${variant}"><span data-title>Inbox</span></header><h1 class="x-large-title">Inbox</h1>${rows()}`,
  };

  // no snapping: a scroll rests where it ends, so nothing cuts a touch fling short
  describe.each(Object.keys(screens) as (keyof typeof screens)[])("%s", (layout) => {
    it.each(["surface", "clean", "soft"])("%s: renders expanded and rests wherever a scroll ends", async (variant) => {
      const el = mount(screens[layout](variant));
      const collapse = box(q(el, ".x-large-title")).height;

      await wait(300);
      expect(el.scrollTop, "render stays expanded").toBe(0);
      for (const y of [1, 10, Math.round(collapse / 2), Math.round(collapse) - 1, 300, 60]) {
        el.scrollTop = y;
        await wait(300);
        expect(el.scrollTop, `rests at ${y}`).toBe(y);
      }
    });
  });
});

describe("x-large-title with an accessory", () => {
  const accessory = `<button class="unset" style="display: flex; inline-size: 40px; block-size: 40px" aria-label="Profile"></button>`;

  it("truncates the title and keeps the accessory's size", () => {
    const el = mount(`<div class="x-large-title"><h1 data-title>${"Very long title ".repeat(6)}</h1>${accessory}</div>${rows()}`);
    const title = q(el, "h1");

    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    expect(box(q(el, ".x-large-title button")).width).toBe(40);
  });

  it("centered: the text centers on the whole row, not beside the accessory", () => {
    const el = mount(`<div class="x-large-title" data-align="center"><h1 data-title>Today</h1>${accessory}</div>${rows()}`);
    const row = q(el, ".x-large-title");
    const range = document.createRange();
    range.selectNodeContents(q(el, "h1"));
    const text = range.getBoundingClientRect();
    const style = getComputedStyle(row);
    const rowCenter =
      (box(row).left + parseFloat(style.paddingLeft) + box(row).right - parseFloat(style.paddingRight)) / 2;

    expect(Math.abs((text.left + text.right) / 2 - rowCenter)).toBeLessThanOrEqual(1);
  });
});
