import { afterEach, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "../button/button.css";
import "../card/card.css";
import "../group/group.css";
import "../segmented-control/segmented-control.css";
import "../text-input/text-input.css";
import "./toolbar.css";

// Real browser. The cases the size matrix (toolbar.geometry.browser.test.ts) doesn't reach: page scroll,
// stacked buttons, oversized controls, painted rows, back buttons, painting and media, truncation.

declare module "vitest/browser" {
  interface BrowserCommands {
    emulateMedia: (media: { colorScheme?: "light" | "dark" | null; forcedColors?: "active" | "none" | null }) => Promise<void>;
    emulateMediaFeatures: (features: { name: string; value: string }[]) => Promise<void>;
  }
}

document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

type Variant = "surface" | "clean" | "soft";
type Position = "top" | "bottom";
type Size = 1 | 2 | 3 | 4;

const SIZES: Size[] = [1, 2, 3, 4];
const VARIANTS: Variant[] = ["surface", "clean", "soft"];
const POSITIONS: Position[] = ["top", "bottom"];
const CONTROL: Record<Size, number> = { 1: 24, 2: 32, 3: 40, 4: 48 };
const floats = (variant: Variant) => variant !== "surface";

function params(variant: Variant, position: Position) {
  if (!floats(variant)) return { start: 12, gap: 12, end: 12, cap: 0 };
  return position === "top" ? { start: 16, gap: 16, end: 8, cap: 4 } : { start: 4, gap: 16, end: 16, cap: 4 };
}
const barHeight = (size: Size, variant: Variant, position: Position, rows = 1) => {
  const p = params(variant, position);
  return p.start + rows * (CONTROL[size] + 2 * p.cap) + (rows - 1) * p.gap + p.end;
};

let host: HTMLElement | undefined;

afterEach(async () => {
  host?.remove();
  host = undefined;
  window.scrollTo(0, 0);
  await commands.emulateMedia({ colorScheme: null, forcedColors: null });
});

function mount(html: string, style = "block-size: 560px; inline-size: 390px; overflow: auto"): HTMLElement {
  host = document.createElement("div");
  host.style.cssText = style;
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

const rows = (count = 40) => `<div>${"<p style='block-size: 48px; margin: 0'>Row</p>".repeat(count)}</div>`;
const q = (root: ParentNode, selector: string) => root.querySelector(selector) as HTMLElement;
const box = (el: Element) => el.getBoundingClientRect();
const middle = (r: { top: number; bottom: number }) => (r.top + r.bottom) / 2;

function near(actual: number, expected: number, label: string, tolerance = 0.1) {
  expect(Math.abs(actual - expected), `${label}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
}

const ICON = `<svg width="1.25em" height="1.25em" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M686-80q-47.5 0-80.75-33.25T572-194q0-8 5-34L278-403q-16.28 17.34-37.64 27.17Q219-366 194-366q-47.5 0-80.75-33T80-480q0-48 33.25-81T194-594q24 0 45 9.3 21 9.29 37 25.7l301-173q-2-8-3.5-16.5T572-766q0-47.5 33.25-80.75T686-880q47.5 0 80.75 33.25T800-766q0 47.5-33.25 80.75T686-652q-23.27 0-43.64-9Q622-670 606-685L302-516q3 8 4.5 17.5t1.5 18q0 8.5-1 16t-3 15.5l303 173q16-15 36.09-23.5 20.1-8.5 43.07-8.5Q734-308 767-274.75T800-194q0 47.5-33.25 80.75T686-80Z" /></svg>`;
const BACK = `<svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="m113-480 315 315q11 11 11 27.5T428-109q-12 12-28.5 12T371-109L42-438q-9-9-13-20t-4-22q0-11 4-22t13-20l330-330q12-12 28-11.5t28 12.5q11 12 11.5 28T428-795L113-480Z" /></svg>`;
const BACK_NEW = `<svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="m368-480 315 315q11 11 11 27.5T683-109q-12 12-28.5 12T626-109L297-438q-9-9-13-20t-4-22q0-11 4-22t13-20l330-330q12-12 28-11.5t28 12.5q11 12 11.5 28T683-795L368-480Z" /></svg>`;

const buttonVariant = (variant: Variant) => (floats(variant) ? "borderless" : "text");
const iconButton = (size: Size, variant: Variant) =>
  `<button class="unset x-button" data-variant="${buttonVariant(variant)}" data-size="${size}" data-icon aria-label="Share">${ICON}</button>`;
const wrap = (variant: Variant, html: string) => (floats(variant) ? `<div class="x-group" data-variant="material">${html}</div>` : `<div>${html}</div>`);
const field = (size: Size, variant: Variant) =>
  `<div class="x-text-input" data-variant="${floats(variant) ? "soft" : "surface"}" data-size="${size}"><input class="unset" aria-label="Search" /></div>`;
const bar = (tag: string, size: Size, variant: Variant, position: Position, inner: string) =>
  `<${tag} class="x-toolbar" data-variant="${variant}" data-size="${size}"${position === "bottom" ? ' data-position="bottom"' : ""}>${inner}</${tag}>`;
const scrollPadding = (el: Element, position: Position) =>
  parseFloat(getComputedStyle(el)[position === "top" ? "scrollPaddingTop" : "scrollPaddingBottom"]);

// ── inactive timeline: nothing scrolls under the bar ────────────────────────────────────────────

const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const native = CSS.supports("animation-timeline: view()");

describe.runIf(native)("inactive timeline", () => {
  it("short content: the bar title and background stay hidden under a visible large title", async () => {
    const el = mount(`${bar("header", 2, "surface", "top", "<div></div><span data-title>Inbox</span><div></div>")}<h1 class="x-large-title">Inbox</h1>${rows(2)}`);
    await frame();

    expect(getComputedStyle(q(el, "header"), "::before").opacity).toBe("0");
    expect(getComputedStyle(q(el, "[data-title]")).opacity).toBe("0");
    expect(getComputedStyle(q(el, ".x-large-title")).opacity).toBe("1");
  });

  it("content scrolling in a sibling: hidden at rest, a script's --scroll-y reveals the bar", async () => {
    const el = mount(
      `<div style="display: flex; flex-direction: column; block-size: 100%">
        ${bar("header", 2, "surface", "top", "<span data-title>Policy</span>")}
        <div style="flex: 1; min-block-size: 0; overflow: auto">${rows()}</div>
      </div>`,
      "block-size: 560px; inline-size: 390px",
    );
    const header = q(el, "header");
    await frame();
    expect(getComputedStyle(header, "::before").opacity).toBe("0");

    header.style.setProperty("--scroll-y", "40px");
    await frame();
    expect(getComputedStyle(header, "::before").opacity).toBe("1");
  });
});

// ── the bar title, and grouped rows, with timelines ──────────────────────────────────────────────

describe.runIf(native)("bar title", () => {
  it('data-align="start": a lone title sits at the bar\'s start edge', async () => {
    const el = mount(`<header class="x-toolbar" data-size="2"><span data-title data-align="start">Playground</span></header>${rows()}`);
    await frame();
    const bar = q(el, "header");
    near(box(q(el, "[data-title]")).left, box(bar).left + parseFloat(getComputedStyle(bar).paddingLeft), "title at the start");
  });

  it('data-reveal="always": revealed at the top, no scroll timeline', async () => {
    const el = mount(`<header class="x-toolbar" data-reveal="always"><span data-title>Playground</span></header>${rows()}`);
    await frame();
    expect(getComputedStyle(q(el, "header")).animationName).toBe("none");
    expect(getComputedStyle(q(el, "header"), "::before").opacity).toBe("1");
  });

  it("a title in a grouped row appears as the large title collapses", async () => {
    const el = mount(
      `<header class="x-toolbar"><div class="x-toolbar"><span data-title>Recents</span></div><div class="x-toolbar"><span>Search</span></div></header><h1 class="x-large-title">Recents</h1>${rows()}`,
    );
    await frame();
    expect(getComputedStyle(q(el, "[data-title]")).opacity).toBe("0");

    el.scrollTop = 300;
    await frame();
    expect(getComputedStyle(q(el, "[data-title]")).opacity).toBe("1");
  });
});

// ── data-align="start": the title's column ──────────────────────────────────────────────────────

describe('bar title data-align="start"', () => {
  const edges = (el: HTMLElement) => {
    const bar = box(q(el, "header"));
    const pad = parseFloat(getComputedStyle(q(el, "header")).paddingLeft);
    return { start: bar.left + pad, end: bar.right - pad, top: bar.top };
  };

  it("first, then a middle and an end: title | middle | end on one row", async () => {
    const el = mount(
      `<header class="x-toolbar" data-size="2"><span data-title data-align="start">Playground</span><select><option>Preset</option></select><div><button>Run</button></div></header>`,
    );
    await frame();
    const { start, end } = edges(el);
    const title = box(q(el, "[data-title]"));
    const select = box(q(el, "select"));
    const div = box(q(el, "header > div"));

    near(title.left, start, "title at the start");
    expect(select.left).toBeGreaterThan(title.right);
    near(div.right, end, "end at the end");
    near(select.top + select.height / 2, div.top + div.height / 2, "one row", 1);
  });

  it("first of two: title | end", async () => {
    const el = mount(`<header class="x-toolbar" data-size="2"><span data-title data-align="start">Playground</span><div><button>Run</button></div></header>`);
    await frame();
    const { start, end } = edges(el);
    near(box(q(el, "[data-title]")).left, start, "title at the start");
    near(box(q(el, "header > div")).right, end, "end at the end");
  });

  it("after a back button: next to it, not centered", async () => {
    const el = mount(
      `<header class="x-toolbar" data-size="2"><div><button>Back</button></div><span data-title data-align="start">Playground</span><div><button>Run</button></div></header>`,
    );
    await frame();
    const back = box(q(el, "header > div"));
    const title = box(q(el, "[data-title]"));
    const gap = parseFloat(getComputedStyle(q(el, "header")).columnGap);

    near(title.left, back.right + gap, "title right after the back region");
  });
});

// ── page scroll: bars on <html> ─────────────────────────────────────────────────────────────────

describe.each(SIZES)("page scroll, data-size=%s", (size) => {
  it.each(VARIANTS)("%s: <html> gets the bars' scroll padding; the bars stick to the viewport edges", async (variant) => {
    const inner = wrap(variant, iconButton(size, variant) + iconButton(size, variant));
    mount(
      `<main><section style="min-block-size: 100dvh; display: flex; flex-direction: column">
        ${bar("header", size, variant, "top", inner)}
        <div style="flex: 1">${rows(60)}</div>
        ${bar("footer", size, variant, "bottom", inner)}
      </section></main>`,
      "",
    );
    const root = document.documentElement;
    const header = q(host!, "header");
    const footer = q(host!, "footer");
    const label = `page size ${size} ${variant}`;

    near(box(header).height, barHeight(size, variant, "top"), `${label}: top bar height`);
    near(box(footer).height, barHeight(size, variant, "bottom"), `${label}: bottom bar height`);
    near(scrollPadding(root, "top"), box(header).height, `${label}: <html> scroll padding top`);
    near(scrollPadding(root, "bottom"), box(footer).height, `${label}: <html> scroll padding bottom`);

    window.scrollTo(0, 400);
    await new Promise((r) => requestAnimationFrame(r));
    near(box(header).top, 0, `${label}: top bar stuck`);
    near(box(footer).bottom, window.innerHeight, `${label}: bottom bar stuck`);
  });
});

// ── stacked buttons ─────────────────────────────────────────────────────────────────────────────

describe.each(SIZES)("stacked buttons, data-size=%s", (size) => {
  describe.each(VARIANTS)("%s", (variant) => {
    it.each(POSITIONS)("%s bar: scroll padding is the bar's height; the buttons are centered inside the insets", (position) => {
      const stacked = (label: string) =>
        `<button class="unset x-button" data-variant="${buttonVariant(variant)}" data-size="${size}" data-layout="stacked">${ICON}<span>${label}</span></button>`;
      const tag = position === "top" ? "header" : "footer";
      const html = bar(tag, size, variant, position, wrap(variant, stacked("Share") + stacked("Copy") + stacked("Delete")));
      const el = mount(position === "top" ? html + rows() : rows() + html);
      const b = q(el, tag);
      const p = params(variant, position);
      const band = { top: box(b).top + p.start, bottom: box(b).bottom - p.end };
      const label = `stacked size ${size} ${variant} ${position}`;

      near(scrollPadding(el, position), box(b).height, `${label}: scroll padding`);
      const region = b.firstElementChild!;
      const content = region.matches(".x-group") ? box(region) : box(region.firstElementChild!);
      near(middle(content), middle(band), `${label}: centered`, 0.51);
      if (region.matches(".x-group")) {
        near(box(region).top, band.top, `${label}: capsule fills the band (top)`);
        near(box(region).bottom, band.bottom, `${label}: capsule fills the band (bottom)`);
      }
    });
  });
});

// ── a control larger than the bar's data-size ───────────────────────────────────────────────────

describe.each(VARIANTS)("oversized control, %s", (variant) => {
  it.each(POSITIONS)("%s bar: grows to keep its insets around the control", (position) => {
    const tag = position === "top" ? "header" : "footer";
    const inner = floats(variant) ? `<div class="x-group" data-variant="material">${field(3, variant)}</div>` : field(3, variant);
    const html = bar(tag, 1, variant, position, inner);
    const el = mount(position === "top" ? html + rows() : rows() + html);
    const b = q(el, tag);
    const p = params(variant, position);
    const control = box(b.firstElementChild!);

    expect(control.top - box(b).top, "space above").toBeGreaterThanOrEqual(p.start - 0.1);
    expect(box(b).bottom - control.bottom, "space below").toBeGreaterThanOrEqual(p.end - 0.1);
  });
});

// ── grouped rows with their own variant ─────────────────────────────────────────────────────────

describe.each(["surface", "soft"] as Variant[])("grouped %s bar with a painted row", (variant) => {
  it.each(POSITIONS)("%s: one background (the row's), same geometry as unpainted rows", (position) => {
    const tag = position === "top" ? "header" : "footer";
    const rowsHtml = (paint: string) =>
      `<div class="x-toolbar">${wrap(variant, iconButton(2, variant))}</div><div class="x-toolbar"${paint}>${wrap(variant, iconButton(2, variant))}</div>`;
    const plain = bar(tag, 2, variant, position, rowsHtml(""));
    const painted = bar(tag, 2, variant, position, rowsHtml(' data-variant="surface"'));
    const el = mount(position === "top" ? plain + painted + rows() : rows() + plain + painted);
    const [plainGroup, paintedGroup] = el.querySelectorAll<HTMLElement>(tag);
    const paintedRow = paintedGroup.lastElementChild as HTMLElement;

    expect(getComputedStyle(paintedGroup, "::before").content, "the group doesn't paint").toBe("none");
    expect(getComputedStyle(paintedRow, "::before").content, "the row paints").not.toBe("none");
    expect(getComputedStyle(plainGroup.lastElementChild!, "::before").content, "an unpainted row doesn't").toBe("none");
    near(box(paintedGroup).height, box(plainGroup).height, "group height unchanged");
    near(box(paintedRow).height, box(plainGroup.lastElementChild!).height, "row height unchanged");
    if (position === "bottom") {
      expect(Number(getComputedStyle(paintedRow, "::before").opacity), "always shown").toBe(1);
      expect(getComputedStyle(paintedRow, "::before").boxShadow, "hairline on the content side").toContain("0px 1px 0px 0px");
    }
  });
});

// ── back buttons in bars ────────────────────────────────────────────────────────────────────────

describe.each(SIZES)("back button in a bar, data-size=%s", (size) => {
  it.each([["ltr", false], ["rtl", true]] as const)("surface, %s: the chevron's box sits on the 16px side padding", (_, rtl) => {
    const back = `<div><button class="unset x-button" data-variant="text" data-size="${size}" data-back>${BACK}Mailboxes</button></div>`;
    const el = mount(`<header class="x-toolbar" data-size="${size}"${rtl ? ' dir="rtl"' : ""}>${back}<span data-title>Inbox</span>${wrap("surface", iconButton(size, "surface"))}</header>${rows()}`);
    const b = q(el, "header");
    const svg = box(q(b, "svg"));

    near(rtl ? box(b).right - svg.right : svg.left - box(b).left, 16, "chevron on the side padding");
    near(svg.height, parseFloat(getComputedStyle(q(b, ".x-button")).lineHeight), "chevron one line tall");
    near(middle(svg), middle(box(q(b, "[data-title]"))), "chevron centered with the title", 0.51);
  });

  it.each(["clean", "soft"] as Variant[])("%s: a chevron-only back button is centered in its capsule", (variant) => {
    const back = `<div class="x-group" data-variant="material"><button class="unset x-button" data-variant="borderless" data-size="${size}" data-back data-icon aria-label="Back">${BACK_NEW}</button></div>`;
    const el = mount(`<header class="x-toolbar" data-variant="${variant}" data-size="${size}">${back}<span data-title>Inbox</span></header>${rows()}`);
    const b = q(el, "header");
    const cap = box(q(b, ".x-group"));
    const button = box(q(b, ".x-button"));
    const svg = box(q(b, "svg"));

    near(cap.left - box(b).left, 16, "capsule on the side padding");
    near(cap.height, CONTROL[size] + 8, "capsule height");
    near(button.width, button.height, "square");
    near(svg.left - button.left, button.right - svg.right, "centered horizontally");
    near(svg.top - button.top, button.bottom - svg.bottom, "centered vertically");
  });
});

// ── painting ────────────────────────────────────────────────────────────────────────────────────

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

describe("in a card (a dialog)", () => {
  const dialog = () =>
    mount(
      `<div class="x-card" data-variant="elevated" data-size="2" style="inline-size: 360px">
        <header class="x-toolbar" data-inset="top" data-size="2"><span data-title data-align="start">Delete file?</span></header>
        <p style="margin: 0">This can't be undone.</p>
        <footer class="x-toolbar" data-inset="bottom" data-position="bottom" data-size="2"><div><button>Cancel</button></div></footer>
      </div>`,
    );

  it("data-inset: the bars sit on the card's edges; nothing overlaps the body", async () => {
    const el = dialog();
    await frame();
    const card = box(q(el, ".x-card"));
    const header = box(q(el, "header"));
    const body = box(q(el, "p"));
    const footer = box(q(el, "footer"));

    near(header.top, card.top + 1, "header on the top edge, inside the ring", 0.5);
    near(header.left, card.left + 1, "header full width", 0.5);
    near(body.top, header.bottom, "body right under the header", 0.5);
    near(footer.top, body.bottom, "footer right under the body", 0.5);
    near(footer.bottom, card.bottom - 1, "footer on the bottom edge", 0.5);
  });
});

describe.runIf(native)("a long dialog: a data-inset=fill scroller inside the card", () => {
  it("the bars pin to the scroller; the header's background fades in as the body scrolls", async () => {
    const el = mount(
      `<div class="x-card" data-variant="elevated" data-size="2" style="inline-size: 360px">
        <div data-inset="fill" style="max-block-size: 300px; overflow: auto">
          <header class="x-toolbar" data-size="2"><span data-title>Terms</span></header>
          ${rows(20)}
          <footer class="x-toolbar" data-position="bottom" data-size="2"><div><button>Accept</button></div></footer>
        </div>
      </div>`,
    );
    const scroller = q(el, ".x-card > div");
    const header = q(el, "header");
    await frame();
    const card = box(q(el, ".x-card"));
    near(box(scroller).top, card.top + 1, "fill: the scroller reaches the ring", 0.5);
    near(box(scroller).left, card.left + 1, "fill: every side", 0.5);
    near(box(scroller).right, card.right - 1, "fill: every side", 0.5);
    expect(getComputedStyle(header, "::before").opacity).toBe("0");
    near(box(q(el, "footer")).bottom, box(scroller).bottom, "footer pinned at the bottom", 0.5);

    scroller.scrollTop = 200;
    await frame();
    expect(getComputedStyle(header, "::before").opacity).toBe("1");
    near(box(header).top, box(scroller).top, "header pinned at the top", 0.5);
    near(box(q(el, "footer")).bottom, box(scroller).bottom, "footer still pinned", 0.5);
  });

  it("the footer shows its background while content is below it, and clears at the end", async () => {
    const el = mount(
      `<div class="x-card" data-variant="elevated" data-size="2" style="inline-size: 360px">
        <div data-inset="fill" style="max-block-size: 300px; overflow: auto">
          <header class="x-toolbar" data-size="2"><span data-title>Terms</span></header>
          ${rows(20)}
          <footer class="x-toolbar" data-position="bottom" data-size="2"><div><button>Accept</button></div></footer>
        </div>
      </div>`,
    );
    const scroller = q(el, "[data-inset='fill']");
    const footer = q(el, "footer");
    await frame();
    expect(getComputedStyle(footer, "::before").opacity).toBe("1");

    scroller.scrollTop = scroller.scrollHeight;
    await frame();
    expect(getComputedStyle(footer, "::before").opacity).toBe("0");
  });

  it("the footer is clear when nothing scrolls", async () => {
    const el = mount(
      `<div class="x-card" data-variant="elevated" data-size="2" style="inline-size: 360px">
        <div data-inset="fill" style="max-block-size: 300px; overflow: auto">
          <p style="margin: 0">Short.</p>
          <footer class="x-toolbar" data-position="bottom" data-size="2"><div><button>OK</button></div></footer>
        </div>
      </div>`,
    );
    await frame();
    expect(getComputedStyle(q(el, "footer"), "::before").opacity).toBe("0");
  });
});

describe("painting", () => {
  it.each(POSITIONS)("surface %s: material background, hairline on the content side", async (position) => {
    const tag = position === "top" ? "header" : "footer";
    const html = bar(tag, 2, "surface", position, wrap("surface", iconButton(2, "surface")));
    const el = mount(position === "top" ? html + rows() : rows() + html);
    const before = getComputedStyle(q(el, tag), "::before");
    await setScroll(el, 100);

    expect(before.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(before.boxShadow).toContain(position === "top" ? "0px -1px 0px 0px" : "0px 1px 0px 0px");
    expect(Number(getComputedStyle(q(el, tag), "::before").opacity)).toBe(1);
  });

  it.each(POSITIONS)("clean %s: no background", (position) => {
    const tag = position === "top" ? "header" : "footer";
    const html = bar(tag, 2, "clean", position, wrap("clean", iconButton(2, "clean")));
    const el = mount(position === "top" ? html + rows() : rows() + html);

    expect(getComputedStyle(q(el, tag), "::before").content).toBe("none");
  });

  it.each(POSITIONS)("soft %s: a blurred gradient from the screen edge, past the bar", (position) => {
    const tag = position === "top" ? "header" : "footer";
    const html = bar(tag, 2, "soft", position, wrap("soft", iconButton(2, "soft")));
    const el = mount(position === "top" ? html + rows() : rows() + html);
    const b = q(el, tag);
    const before = getComputedStyle(b, "::before");

    // "to bottom" is the default direction, so it serializes as nothing
    const toTop = (v: string) => v.includes("to top");
    expect(toTop(before.backgroundImage), "gradient direction").toBe(position === "bottom");
    expect(toTop(before.maskImage), "mask direction").toBe(position === "bottom");
    expect(before.backdropFilter).toContain("blur");
    expect(parseFloat(position === "top" ? before.bottom : before.top), "reaches 16px past the bar").toBe(-16);
  });

  it("dark theme: the surface background changes with the theme", () => {
    const html = (theme: string) => `<div class="${theme}" style="block-size: 200px; overflow: auto">${bar("header", 2, "surface", "top", wrap("surface", iconButton(2, "surface")))}${rows()}</div>`;
    const el = mount(html("light") + html("dark"), "");
    const [light, dark] = el.querySelectorAll("header");

    expect(getComputedStyle(dark, "::before").backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(dark, "::before").backgroundColor).not.toBe(getComputedStyle(light, "::before").backgroundColor);
  });

  // the browser forces colors itself; the toolbar's part is a real border (box shadows drop) and no blur
  it("forced colors: a hairline border in place of the shadow, no blur", async () => {
    await commands.emulateMedia({ forcedColors: "active" });
    expect(matchMedia("(forced-colors: active)").matches).toBe(true);
    const el = mount(bar("header", 2, "surface", "top", wrap("surface", iconButton(2, "surface"))) + rows());
    const before = getComputedStyle(q(el, "header"), "::before");

    expect(before.borderBottomStyle).toBe("solid");
    expect(before.borderBottomWidth).toBe("1px");
    expect(before.backdropFilter).toBe("none");
  });

  it("reduced transparency: a solid background, no blur (Chromium)", async ({ skip }) => {
    if (!navigator.userAgent.includes("Chrome")) skip();
    await commands.emulateMediaFeatures([{ name: "prefers-reduced-transparency", value: "reduce" }]);
    try {
      expect(matchMedia("(prefers-reduced-transparency: reduce)").matches).toBe(true);
      const el = mount(bar("header", 2, "surface", "top", wrap("surface", iconButton(2, "surface"))) + rows(), "block-size: 560px; overflow: auto; --color-material-solid: rgb(1, 2, 3); --backdrop-filter-material: blur(10px)");
      const before = getComputedStyle(q(el, "header"), "::before");

      expect(before.backgroundColor).toBe("rgb(1, 2, 3)");
      expect(before.backdropFilter).toBe("none");
    } finally {
      await commands.emulateMediaFeatures([{ name: "prefers-reduced-transparency", value: "" }]);
    }
  });
});

// ── truncation ──────────────────────────────────────────────────────────────────────────────────

describe.each(SIZES)("a long title, data-size=%s", (size) => {
  it.each(VARIANTS)("%s: truncates between whole buttons", (variant) => {
    const long = "Notifications and Privacy Preferences ".repeat(3);
    const el = mount(bar("header", size, variant, "top", `${wrap(variant, iconButton(size, variant))}<span data-title>${long}</span>${wrap(variant, iconButton(size, variant) + iconButton(size, variant))}`) + rows());
    const b = q(el, "header");
    const title = q(b, "[data-title]");
    const [start, , end] = b.children;

    expect(title.scrollWidth, "truncated").toBeGreaterThan(title.clientWidth);
    expect(box(title).left, "after the start buttons").toBeGreaterThanOrEqual(box(start).right);
    expect(box(title).right, "before the end buttons").toBeLessThanOrEqual(box(end).left);
    near(box(start).left - box(b).left, 16, "start buttons whole, on the padding");
    near(box(b).right - box(end).right, 16, "end buttons whole, on the padding");
  });
});
