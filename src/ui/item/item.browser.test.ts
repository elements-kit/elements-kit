import { afterEach, describe, expect, it } from "vitest";
import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "../styles/palette/red.css";
import "../styles/accent/red.css";
import "../avatar/avatar.css";
import "../card/card.css";
import "../button/button.css";
import "./item.css";

let host: HTMLElement;
const box = (el: Element) => el.getBoundingClientRect();
const css = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
const mid = (b: DOMRect) => b.top + b.height / 2;
const q = <T extends Element = HTMLElement>(selector: string) => host.querySelector<T>(selector)!;

afterEach(() => host?.remove());

const avatar = (size: string) =>
  `<span class="x-avatar" data-size="${size}"><span class="x-avatar-fallback">FM</span></span>`;

function mount(html: string, { size = "3", dir = "ltr", width = 480 } = {}) {
  host = document.createElement("div");
  host.dataset.neutral = "gray";
  host.dataset.accent = "mint";
  host.dir = dir;
  host.style.width = `${width}px`;
  host.innerHTML = `<div class="x-card" data-size="${size}"><div data-inset="fill">${html}</div></div>`;
  document.body.append(host);
  return q(".x-item");
}

const song = (size: string, description = true) => `
  <li class="unset x-item" data-interactive>
    ${avatar(size)}
    <div class="x-item-content">
      <a class="x-item-link x-item-title" data-variant="compact" href="#">Everything In Its Right Place</a>
      ${description ? `<span class="x-item-description">Radiohead</span>` : ""}
    </div>
    <div class="x-item-trailing">
      <span>4:11</span>
      <button class="unset x-button" data-variant="borderless" data-icon data-size="${size}" aria-label="More">
        <svg width="1.25em" height="1.25em" viewBox="0 0 24 24"></svg>
      </button>
    </div>
  </li>`;

// size → avatar, spacing (padding and gaps), row height, title px, compact title px
for (const [size, avatarSize, spacing, height, title, compact] of [
  ["1", 24, 8, 40, 12, 10],
  ["2", 32, 8, 48, 14, 12],
  ["3", 40, 12, 64, 16, 14],
] as const) {
  describe(`size ${size}`, () => {
    for (const description of [true, false]) {
      it(`puts the avatar in a square cell ${description ? "with" : "without"} a description`, () => {
        const row = mount(song(size, description), { size });
        const r = box(row);
        const a = box(q(".x-avatar"));
        expect(r.height).toBe(height);
        expect(a.width).toBe(avatarSize);
        expect([a.top - r.top, r.bottom - a.bottom, a.left - r.left]).toEqual([spacing, spacing, spacing]);
        expect(box(q(".x-item-content")).left - a.right).toBe(spacing);

        for (const part of [".x-avatar", ".x-item-content", ".x-item-trailing"]) {
          expect(mid(box(q(part))), part).toBe(mid(r));
        }
      });
    }

    it("makes a title one size up and regular, and a compact one the row's size and medium", () => {
      const row = mount(song(size, false), { size });
      const t = q(".x-item-title");
      expect(css(t).fontSize).toBe(`${compact}px`);
      expect(css(t).fontWeight).toBe("500");
      delete t.dataset.variant;
      expect(css(t).fontSize).toBe(`${title}px`);
      expect(css(t).fontWeight).toBe("400");
      expect(box(row).height).toBe(height);
    });

    it("ends an icon button's glyph at the row padding, like a chevron", () => {
      const row = mount(song(size), { size });
      expect(box(row).right - box(q(".x-item-trailing svg")).right).toBe(spacing);
    });

    it("draws data-separator from where the text starts, and not under the last row", () => {
      mount(`<ul class="unset">${song(size)}${song(size)}</ul>`, { size });
      const [first, last] = host.querySelectorAll<HTMLElement>(".x-item");
      first.dataset.separator = "";
      last.dataset.separator = "";
      const line = css(first, "::after");
      expect(line.borderBottomWidth).toBe("1px");
      expect(box(first).left + parseFloat(line.left)).toBe(box(q(".x-item-content")).left);
      expect(parseFloat(line.bottom)).toBe(0);
      expect(css(last, "::after").content).toBe("none");
    });

    it("draws data-separator on rows wrapped in <li>, except the last", () => {
      const link = (sep: boolean) =>
        `<li><a class="x-item" href="#" ${sep ? "data-separator" : ""}><div class="x-item-content"><span class="x-item-title">Row</span></div></a></li>`;
      mount(`<ul class="unset">${link(true)}${link(true)}</ul>`, { size });
      const [first, last] = host.querySelectorAll<HTMLElement>(".x-item");
      expect(css(first, "::after").content).not.toBe("none");
      expect(css(last, "::after").content).toBe("none");
    });

    it('with data-align="start", tops the avatar and puts trailing on the title line', () => {
      const row = mount(song(size), { size });
      row.dataset.align = "start";
      q(".x-item-description").textContent = "A long preview that keeps going ".repeat(12);
      const lineHeight = parseFloat(css(q(".x-item-description")).lineHeight);
      expect(box(q(".x-avatar")).top - box(row).top).toBe(spacing);
      expect(Math.round(box(q(".x-item-description")).height / lineHeight)).toBe(3);
      // lines past 3 are hidden, not spilled over the next row
      const next = document.createElement("div");
      row.after(next);
      expect(document.elementFromPoint(box(next).left + 60, box(next).top + 2)).not.toBe(q(".x-item-description"));
      expect(css(q(".x-item-description")).overflowY).toBe("hidden");
      expect(mid(box(q(".x-item-trailing")))).toBe(mid(box(q(".x-item-title"))));
    });
  });
}

it("wraps a title or description with data-wrap", () => {
  mount(song("3"), { width: 240 });
  for (const part of [".x-item-title", ".x-item-description"]) {
    const el = q(part);
    el.textContent = "A long line that keeps going ".repeat(4);
    const single = box(el).height;
    el.dataset.wrap = "";
    expect(box(el).height, part).toBeGreaterThan(single);
    expect(el.scrollWidth, part).toBe(el.clientWidth);
  }
});

it("fills its container, even on a button", () => {
  mount(`<button class="unset x-item"><div class="x-item-content"><span class="x-item-title">Sign out</span></div></button>`);
  expect(box(q(".x-item")).width).toBe(box(q("[data-inset]")).width);
});

it("truncates a long title without squeezing the avatar or trailing", () => {
  const row = mount(song("3"), { width: 240 });
  expect(box(q(".x-avatar")).width).toBe(40);
  expect(q(".x-item-title").scrollWidth).toBeGreaterThan(q(".x-item-title").clientWidth);
  expect(box(q(".x-item-trailing")).right).toBeLessThanOrEqual(box(row).right);
  expect(host.scrollWidth).toBe(host.clientWidth);
});

it("routes a click on the row to its link, and on a trailing button to the button", () => {
  const row = mount(song("3"));
  const r = box(row);
  expect(document.elementFromPoint(r.left + 2, r.top + 2)).toBe(q(".x-item-link"));
  const b = box(q(".x-item-trailing button"));
  expect(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest("button")).toBe(q(".x-item-trailing button"));
});

it("tints selected rows, colors accent rows, and dims disabled rows", () => {
  const row = mount(song("3"));
  const transparent = "rgba(0, 0, 0, 0)";
  expect(css(row).backgroundColor).toBe(transparent);
  row.setAttribute("aria-current", "true");
  expect(css(row).backgroundColor).not.toBe(transparent);
  row.setAttribute("aria-current", "false");
  expect(css(row).backgroundColor).toBe(transparent);
  row.dataset.accent = "red";
  expect(css(row).color).not.toBe(css(q(".x-card")).color);
  row.setAttribute("aria-disabled", "true");
  expect(css(row).opacity).toBe("0.5");
  expect(css(row).pointerEvents).toBe("none");
});

it("mirrors the chevron in RTL", () => {
  mount(
    `<a class="x-item" href="#"><div class="x-item-content"><span class="x-item-title">Wi-Fi</span></div>
      <div class="x-item-trailing"><svg class="x-item-chevron" width="20" height="20"></svg></div></a>`,
    { dir: "rtl" },
  );
  expect(css(q(".x-item-chevron")).scale).toBe("-1 1");
});
