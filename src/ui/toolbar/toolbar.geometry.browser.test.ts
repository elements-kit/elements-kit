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

// Real Chromium. Every bar is checked against one formula, for every scaling, size, variant and position:
//
//   h   = control height of the bar's data-size: 24 | 32 | 40 | 48
//   cap = capsule padding: 4 floating, 0 surface
//   row = h + 2·cap
//   bar = start + n·row + (n − 1)·gap + end        (n rows; all × scaling)
//
//   surface          start 12, gap 12, end 12
//   floating top     start 16, gap 16, end 8
//   floating bottom  start 4,  gap 16, end 16

document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

type Variant = "surface" | "clean" | "soft";
type Position = "top" | "bottom";
type Size = 1 | 2 | 3 | 4;
type Control = "text" | "textIcon" | "icon" | "icons" | "field" | "segmented" | "title";

const SCALINGS = [["xs", 0.9], ["sm", 0.95], ["md", 1], ["lg", 1.05], ["xl", 1.1]] as const;
const SIZES: Size[] = [1, 2, 3, 4];
const VARIANTS: Variant[] = ["surface", "clean", "soft"];
const POSITIONS: Position[] = ["top", "bottom"];
const CONTROL: Record<Size, number> = { 1: 24, 2: 32, 3: 40, 4: 48 };
/** fields and segmented controls come in sizes 1–3 */
const hasSize = (kind: Control, size: Size) => size < 4 || (kind !== "field" && kind !== "segmented");

const floats = (variant: Variant) => variant !== "surface";

function params(variant: Variant, position: Position) {
  if (!floats(variant)) return { start: 12, gap: 12, end: 12, cap: 0 };
  return position === "top" ? { start: 16, gap: 16, end: 8, cap: 4 } : { start: 4, gap: 16, end: 16, cap: 4 };
}

/** unscaled px */
const rowHeight = (size: Size, variant: Variant) => CONTROL[size] + 2 * params(variant, "top").cap;
const barHeight = (size: Size, variant: Variant, position: Position, rows = 1, content = CONTROL[size]) => {
  const p = params(variant, position);
  return p.start + rows * (content + 2 * p.cap) + (rows - 1) * p.gap + p.end;
};

// ── DOM ─────────────────────────────────────────────────────────────────────────────────────────

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

/** A 390×560 scroll container at a scaling. */
function mount(scaling: string, html: string): HTMLElement {
  host = document.createElement("div");
  host.dataset.scaling = scaling;
  host.style.cssText = "block-size: 560px; inline-size: 390px; overflow: auto";
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

const rows = () => `<div>${"<p style='block-size: 48px; margin: 0'>Row</p>".repeat(40)}</div>`;
const q = (root: ParentNode, selector: string) => root.querySelector(selector) as HTMLElement;
const box = (el: Element) => el.getBoundingClientRect();
const middle = (r: { top: number; bottom: number }) => (r.top + r.bottom) / 2;

const ICON = `<svg width="1.25em" height="1.25em" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M686-80q-47.5 0-80.75-33.25T572-194q0-8 5-34L278-403q-16.28 17.34-37.64 27.17Q219-366 194-366q-47.5 0-80.75-33T80-480q0-48 33.25-81T194-594q24 0 45 9.3 21 9.29 37 25.7l301-173q-2-8-3.5-16.5T572-766q0-47.5 33.25-80.75T686-880q47.5 0 80.75 33.25T800-766q0 47.5-33.25 80.75T686-652q-23.27 0-43.64-9Q622-670 606-685L302-516q3 8 4.5 17.5t1.5 18q0 8.5-1 16t-3 15.5l303 173q16-15 36.09-23.5 20.1-8.5 43.07-8.5Q734-308 767-274.75T800-194q0 47.5-33.25 80.75T686-80Z" /></svg>`;

const buttonVariant = (variant: Variant) => (floats(variant) ? "borderless" : "text");
const textButton = (label: string, size: Size, variant: Variant, icon = false) =>
  `<button class="unset x-button" data-variant="${buttonVariant(variant)}" data-size="${size}">${icon ? ICON : ""}${label}</button>`;
const iconButton = (label: string, size: Size, variant: Variant) =>
  `<button class="unset x-button" data-variant="${buttonVariant(variant)}" data-size="${size}" data-icon aria-label="${label}">${ICON}</button>`;
const capsule = (inner: string) => `<div class="x-group" data-variant="material">${inner}</div>`;
const field = (size: Size, variant: Variant) =>
  `<div class="x-text-input" data-variant="${floats(variant) ? "soft" : "surface"}" data-size="${size}"><span>${ICON}</span><input class="unset" type="search" aria-label="Search" /></div>`;

let radios = 0;
const segmented = (size: Size, variant: Variant, stacked = false) => {
  const name = `seg-${radios++}`;
  return `<div class="unset x-segmented-control" data-variant="${floats(variant) ? "soft" : "surface"}" data-size="${size}"${stacked ? ' data-layout="stacked"' : ""} role="radiogroup" aria-label="Filter">${["All", "Unread", "Flagged"]
    .map((o, i) => `<label><input type="radio" name="${name}" value="${o}"${i === 0 ? " checked" : ""} />${stacked ? ICON : ""}<span>${o}</span></label>`)
    .join("")}</div>`;
};

/** One region as the stories build it: floating bars put controls in a material capsule, surface bars in a plain wrapper. */
function region(kind: Control, size: Size, variant: Variant): string {
  const wrap = (html: string) => (floats(variant) ? capsule(html) : `<div>${html}</div>`);
  switch (kind) {
    case "text": return wrap(textButton("Edit", size, variant));
    case "textIcon": return wrap(textButton("Mailboxes", size, variant, true));
    case "icon": return wrap(iconButton("Back", size, variant));
    case "icons": return wrap(iconButton("Share", size, variant) + iconButton("More", size, variant));
    case "field": return floats(variant) ? capsule(field(size, variant)) : field(size, variant);
    case "segmented": return floats(variant) ? capsule(segmented(size, variant)) : segmented(size, variant);
    case "title": return `<span data-title>Title</span>`;
  }
}

const bar = (tag: string, size: Size | undefined, variant: Variant, position: Position, inner: string, extra = "") =>
  `<${tag} class="x-toolbar" data-variant="${variant}"${size ? ` data-size="${size}"` : ""}${position === "bottom" ? ' data-position="bottom"' : ""}${extra}>${inner}</${tag}>`;

// ── assertions ──────────────────────────────────────────────────────────────────────────────────

/** layout snaps to 1/64px */
function near(actual: number, expected: number, label: string, tolerance = 0.1) {
  expect(Math.abs(actual - expected), `${label}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
}

type Edges = { left: number; right: number; top: number; bottom: number };

/** What a button paints horizontally: its icon and its label text (not its padding or bleed). */
function contentBox(button: Element): Edges {
  const rects: DOMRect[] = [];
  const svg = button.querySelector("svg");
  if (svg) rects.push(svg.getBoundingClientRect());
  for (const node of button.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    rects.push(range.getBoundingClientRect());
  }
  return {
    left: Math.min(...rects.map((r) => r.left)),
    right: Math.max(...rects.map((r) => r.right)),
    top: Math.min(...rects.map((r) => r.top)),
    bottom: Math.max(...rects.map((r) => r.bottom)),
  };
}

/** The boxes a region shows: a capsule, field or track is one box; buttons each; a title its text. */
function shown(region: Element): Element[] {
  if (region.matches(".x-group, .x-text-input, .x-segmented-control, [data-title]")) return [region];
  const buttons = [...region.querySelectorAll(".x-button")];
  return buttons.length ? buttons : [region];
}

/** Horizontal extent of what a region paints. */
function painted(region: Element): Edges {
  const edges = shown(region).map((el) => (el.matches(".x-button") ? contentBox(el) : box(el)));
  if (region.matches("[data-title]")) {
    const range = document.createRange();
    range.selectNodeContents(region);
    edges[0] = range.getBoundingClientRect();
  }
  return {
    left: Math.min(...edges.map((e) => e.left)),
    right: Math.max(...edges.map((e) => e.right)),
    top: Math.min(...edges.map((e) => e.top)),
    bottom: Math.max(...edges.map((e) => e.bottom)),
  };
}

const fills = (kind: Control) => kind === "field" || kind === "segmented";

/**
 * A row of regions inside `band` (the space between the bar's insets): every control centered on the band;
 * capsules, fields and tracks fill it; the first and last content sit on the 16px side padding
 * (a lone child centers instead).
 */
function expectRow(row: HTMLElement, band: { top: number; bottom: number }, layout: Control[], k: number, label: string, rtl = false) {
  const b = box(row);
  const regions = [...row.children];
  expect(regions.length, `${label}: regions`).toBe(layout.length);

  for (const [i, r] of regions.entries()) {
    for (const el of shown(r)) near(middle(box(el)), middle(band), `${label}: region ${i + 1} centered`, 0.51);
    if (r.matches(".x-group, .x-text-input, .x-segmented-control")) {
      near(box(r).top, band.top, `${label}: region ${i + 1} fills the band (top)`);
      near(box(r).bottom, band.bottom, `${label}: region ${i + 1} fills the band (bottom)`);
    }
  }

  const startEdge = (p: Edges) => (rtl ? b.right - p.right : p.left - b.left);
  const endEdge = (p: Edges) => (rtl ? p.left - b.left : b.right - p.right);

  if (layout.length === 1 && !fills(layout[0])) {
    const p = painted(regions[0]);
    near((p.left + p.right) / 2, (b.left + b.right) / 2, `${label}: lone child centered`, 1);
    return;
  }
  if (layout[0] !== "title") near(startEdge(painted(regions[0])), 16 * k, `${label}: start on the side padding`);
  if (layout.at(-1) !== "title") near(endEdge(painted(regions.at(-1)!)), 16 * k, `${label}: end on the side padding`);
}

/** A material capsule of size-`size` children: h + 8, children 4px in, icon buttons h squares, corners concentric. */
function expectCapsule(cap: HTMLElement, size: Size, k: number, label: string) {
  const c = box(cap);
  near(c.height, (CONTROL[size] + 8) * k, `${label}: capsule height`);
  const kids = [...cap.children];
  near(box(kids[0]).left - c.left, 4 * k, `${label}: capsule start inset`);
  near(c.right - box(kids.at(-1)!).right, 4 * k, `${label}: capsule end inset`);
  for (const kid of kids) {
    near(box(kid).top - c.top, 4 * k, `${label}: child top inset`);
    near(c.bottom - box(kid).bottom, 4 * k, `${label}: child bottom inset`);
    if (kid.matches(".x-button[data-icon]")) {
      near(box(kid).width, CONTROL[size] * k, `${label}: icon button width`);
      near(box(kid).height, CONTROL[size] * k, `${label}: icon button height`);
    }
  }
  const radius = (el: Element) => parseFloat(getComputedStyle(el).borderTopLeftRadius);
  near(radius(cap), radius(kids[0]) + 4 * k, `${label}: concentric corners`);
}

const scrollPadding = (el: HTMLElement, position: Position) =>
  parseFloat(getComputedStyle(el)[position === "top" ? "scrollPaddingTop" : "scrollPaddingBottom"]);

/** The band between a bar's insets. */
function band(el: HTMLElement, variant: Variant, position: Position, k: number) {
  const p = params(variant, position);
  const b = box(el);
  return { top: b.top + p.start * k, bottom: b.bottom - p.end * k };
}

// ── single bars ─────────────────────────────────────────────────────────────────────────────────

const LAYOUTS: Control[][] = [
  ["textIcon", "title", "text"],
  ["icon", "title", "icons"],
  ["text", "title", "icon"],
  ["icon", "icons"],
  ["title"],
  ["icons"],
  ["field"],
  ["segmented"],
  ["field", "icon"],
];

describe.each(SCALINGS)("x-toolbar geometry, scaling %s", (scaling, k) => {
  describe.each(SIZES)("data-size=%s", (size) => {
    describe.each(VARIANTS)("%s", (variant) => {
      describe.each(POSITIONS)("%s bar", (position) => {
        const layouts = LAYOUTS.filter((layout) => layout.every((kind) => hasSize(kind, size)));

        it.each(layouts.map((layout) => [layout.join(" | "), layout] as const))("%s", (name, layout) => {
          const tag = position === "top" ? "header" : "footer";
          const html = bar(tag, size, variant, position, layout.map((kind) => region(kind, size, variant)).join(""));
          const el = mount(scaling, position === "top" ? html + rows() : rows() + html);
          const b = q(el, tag);
          const label = `${scaling} size ${size} ${variant} ${position} [${name}]`;

          near(box(b).height, barHeight(size, variant, position) * k, `${label}: bar height`);
          near(scrollPadding(el, position), box(b).height, `${label}: scroll padding`);
          if (position === "bottom") near(box(b).bottom, box(el).bottom, `${label}: at the bottom`);
          else near(box(b).top, box(el).top, `${label}: at the top`);
          expectRow(b, band(b, variant, position, k), layout, k, label);
          for (const cap of b.querySelectorAll<HTMLElement>(".x-group")) expectCapsule(cap, size, k, label);
        });
      });

      it("rtl: start content on the right padding, end content on the left", () => {
        const layout: Control[] = ["textIcon", "title", "icon"];
        const el = mount(scaling, bar("header", size, variant, "top", layout.map((kind) => region(kind, size, variant)).join(""), ' dir="rtl"') + rows());
        const b = q(el, "header");

        expectRow(b, band(b, variant, "top", k), layout, k, `${scaling} size ${size} ${variant} rtl`, true);
      });
    });
  });
});

describe("x-toolbar geometry: data-size", () => {
  it.each(VARIANTS)("%s: no data-size is size 2", (variant) => {
    const el = mount("md", bar("header", undefined, variant, "top", region("icons", 2, variant)) + rows() + bar("footer", undefined, variant, "bottom", region("icons", 2, variant)));

    near(box(q(el, "header")).height, barHeight(2, variant, "top"), "top");
    near(box(q(el, "footer")).height, barHeight(2, variant, "bottom"), "bottom");
    near(scrollPadding(el, "top"), barHeight(2, variant, "top"), "top scroll padding");
    near(scrollPadding(el, "bottom"), barHeight(2, variant, "bottom"), "bottom scroll padding");
  });

  it.each(VARIANTS)("%s: smaller controls center in a larger bar", (variant) => {
    const layout: Control[] = ["icon", "title", "icons"];
    const el = mount("md", bar("header", 3, variant, "top", layout.map((kind) => region(kind, 2, variant)).join("")) + rows());
    const b = q(el, "header");

    near(box(b).height, barHeight(3, variant, "top"), "bar height");
    for (const r of b.children) for (const s of shown(r)) near(middle(box(s)), middle(band(b, variant, "top", 1)), "centered", 0.51);
  });

  it.each(VARIANTS)("%s: top and bottom bars take their own sizes", (variant) => {
    const el = mount("md", bar("header", 3, variant, "top", region("icons", 3, variant)) + rows() + bar("footer", 1, variant, "bottom", region("icons", 1, variant)));

    near(scrollPadding(el, "top"), barHeight(3, variant, "top"), "top");
    near(scrollPadding(el, "bottom"), barHeight(1, variant, "bottom"), "bottom");
  });
});

// ── grouped bars: rows that stick as one ────────────────────────────────────────────────────────

const ROWS: Record<2 | 3, Control[][]> = {
  2: [["icon", "title", "icons"], ["field"]],
  3: [["icon", "title", "icons"], ["field"], ["segmented"]],
};

describe.each(SCALINGS)("x-toolbar geometry: grouped, scaling %s", (scaling, k) => {
  describe.each(SIZES)("data-size=%s", (size) => {
    describe.each(VARIANTS)("%s", (variant) => {
      describe.each(POSITIONS)("%s", (position) => {
        it.each([2, 3] as const)("%s rows", (n) => {
          const layouts = ROWS[n].map((layout) => (layout.every((kind) => hasSize(kind, size)) ? layout : (["text", "title", "icon"] as Control[])));
          const tag = position === "top" ? "header" : "footer";
          const inner = layouts.map((layout) => `<div class="x-toolbar">${layout.map((kind) => region(kind, size, variant)).join("")}</div>`).join("");
          const html = bar(tag, size, variant, position, inner);
          const el = mount(scaling, position === "top" ? html + rows() : rows() + html);
          const group = q(el, tag);
          const p = params(variant, position);
          const row = rowHeight(size, variant);
          const label = `${scaling} size ${size} ${variant} ${position} ${n} rows`;

          near(box(group).height, barHeight(size, variant, position, n) * k, `${label}: group height`);
          near(scrollPadding(el, position), box(group).height, `${label}: scroll padding`);
          if (position === "bottom") near(box(group).bottom, box(el).bottom, `${label}: at the bottom`);

          for (const [i, r] of [...group.querySelectorAll<HTMLElement>(":scope > .x-toolbar")].entries()) {
            const top = box(group).top + (p.start + i * (row + p.gap)) * k;
            near(box(r).top, top, `${label}: row ${i + 1} top`);
            near(box(r).height, row * k, `${label}: row ${i + 1} height`);
            expectRow(r, box(r), layouts[i], k, `${label}: row ${i + 1}`);
          }
          for (const cap of group.querySelectorAll<HTMLElement>(".x-group")) expectCapsule(cap, size, k, label);
        });
      });
    });
  });
});

// ── stacked controls: a tab bar ─────────────────────────────────────────────────────────────────

describe.each(SCALINGS)("x-toolbar geometry: stacked tab bar, scaling %s", (scaling, k) => {
  describe.each([1, 2, 3] as Size[])("data-size=%s", (size) => {
    describe.each(VARIANTS)("%s", (variant) => {
      it.each(POSITIONS)("%s", (position) => {
        const tag = position === "top" ? "header" : "footer";
        const track = segmented(size, variant, true);
        const html = bar(tag, size, variant, position, floats(variant) ? capsule(track) : track);
        const el = mount(scaling, position === "top" ? html + rows() : rows() + html);
        const b = q(el, tag);
        // a stacked track is 58 units tall; a unit is h / 32
        const stacked = (CONTROL[size] * 58) / 32;
        const label = `${scaling} size ${size} ${variant} ${position} tab bar`;

        near(box(q(b, ".x-segmented-control")).height, stacked * k, `${label}: track height`);
        near(box(b).height, barHeight(size, variant, position, 1, stacked) * k, `${label}: bar height`);
        near(scrollPadding(el, position), box(b).height, `${label}: scroll padding`);
      });
    });
  });
});

// ── with a large title ──────────────────────────────────────────────────────────────────────────

const opacity = (el: Element, pseudo?: string) => Number(getComputedStyle(el, pseudo).opacity);
const setScroll = (el: HTMLElement, y: number) => el.style.setProperty("--scroll-y", `${y}px`);
/** Where a title snaps: its top minus its scroll margin and the container's scroll padding — reachable (0), not clamped. */
const titleSnap = (el: HTMLElement) => {
  const title = q(el, ".x-large-title");
  return box(title).top - box(el).top + el.scrollTop - parseFloat(getComputedStyle(title).scrollMarginTop) - parseFloat(getComputedStyle(el).scrollPaddingTop);
};

describe.each(SCALINGS)("x-toolbar geometry: large title, scaling %s", (scaling, k) => {
  describe.each(SIZES)("data-size=%s", (size) => {
    describe.each(VARIANTS)("%s", (variant) => {
      const layout: Control[] = size < 4 ? ["field"] : ["icon", "title", "icons"];
      const inner = layout.map((kind) => region(kind, size, variant)).join("");

      it("title first: 56px title right above the bar, collapse over the title, snaps at 0", () => {
        const el = mount(scaling, `<h1 class="x-large-title">Settings</h1>${bar("header", size, variant, "top", inner)}${rows()}`);
        const title = q(el, ".x-large-title");
        const b = q(el, "header");
        const label = `${scaling} size ${size} ${variant} title first`;

        near(box(title).height, 56 * k, `${label}: title height`);
        near(box(b).top, box(title).bottom, `${label}: bar right under the title`);
        near(box(b).height, barHeight(size, variant, "top") * k, `${label}: bar height`);
        near(scrollPadding(el, "top"), box(b).height, `${label}: scroll padding`);
        near(titleSnap(el), 0, `${label}: title snap point`);
        setScroll(el, box(title).height / 2);
        near(opacity(title), 0.5, `${label}: half faded`, 0.01);
        setScroll(el, box(title).height);
        near(opacity(title), 0, `${label}: gone`, 0.001);
        near(opacity(b, "::before"), 1, `${label}: bar background shown`, 0.001);
      });

      it("bar first: 48px title right under the bar, collapse over the title, snaps at 0", () => {
        const el = mount(scaling, `${bar("header", size, variant, "top", inner)}<h1 class="x-large-title">Inbox</h1>${rows()}`);
        const title = q(el, ".x-large-title");
        const b = q(el, "header");
        const label = `${scaling} size ${size} ${variant} bar first`;

        near(box(b).height, barHeight(size, variant, "top") * k, `${label}: bar height`);
        near(box(title).top, box(b).bottom, `${label}: title right under the bar`);
        near(box(title).height, 48 * k, `${label}: title height`);
        near(titleSnap(el), 0, `${label}: title snap point`);
        setScroll(el, box(title).height / 2);
        near(opacity(title), 0.5, `${label}: half faded`, 0.01);
      });
    });
  });
});
