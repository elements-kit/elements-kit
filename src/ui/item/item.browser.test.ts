import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "../card/card.css";
import "../switch/switch.css";
import "../button/button.css";
import "../avatar/avatar.css";
import "../list/list.css";
import "./item.css";

// Real Chromium: every part is an explicit class, so assert geometry and computed state.

document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

function mount(html: string): HTMLElement {
  host = document.createElement("div");
  host.style.width = "390px";
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

const q = (root: ParentNode, selector: string) => root.querySelector(selector) as HTMLElement;
const box = (el: Element) => el.getBoundingClientRect();
const mid = (b: DOMRect) => b.top + b.height / 2;

const row = (attrs = "", extra = "", avatarSize = "2") => `
  <a class="x-item" href="#" ${attrs}>
    <span class="x-avatar" data-size="${avatarSize}"><span class="x-avatar-fallback">AL</span></span>
    <span class="x-item-content">
      <span class="x-item-title">Alice Laurent</span>
      ${extra}
    </span>
    <time>9:41</time>
    <svg class="x-item-chevron" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" /></svg>
  </a>`;

describe("x-item layout", () => {
  it("puts the avatar before the content and trailing elements after it, 8px apart", () => {
    const root = mount(row());
    const item = q(root, ".x-item");
    const avatar = box(q(item, ".x-avatar"));
    const content = box(q(item, ".x-item-content"));
    const time = box(q(item, "time"));
    const chevron = box(q(item, ".x-item-chevron"));

    // avatar in a square cell, like music.apple.com: 8px from the top, bottom and start; text one
    // text padding (12px) after it
    expect(Math.round(content.left - avatar.right)).toBe(12);
    expect(avatar.top - box(item).top).toBe(8);
    expect(box(item).bottom - avatar.bottom).toBe(8);
    // trailing is pushed to the end; time → chevron glyph: 8px. The glyph spans 36%–63% of its 1.6em box.
    expect(time.left).toBeGreaterThan(content.left);
    const glyphLeft = chevron.left + chevron.width * (345 / 960);
    const glyphRight = chevron.left + chevron.width * (604 / 960);
    // value → chevron 8/44 → 9px; side margin 16/44 → 17px
    expect(Math.round(glyphLeft - time.right)).toBe(9);
    expect(Math.round(box(item).right - glyphRight)).toBe(17);
    expect(Math.round(avatar.left - box(item).left)).toBe(8);
    // iOS proportion: glyph height ≈ 0.76 × the 14px text
    expect(chevron.height * (457 / 960)).toBeCloseTo(14 * 0.76, 0);
  });

  it("adds nothing it wasn't given: no generated chevron or indicator", () => {
    const root = mount(`<a class="x-item" href="#"><span class="x-item-content"><span class="x-item-title">Plain</span></span></a>`);
    const item = q(root, ".x-item");
    expect(getComputedStyle(item, "::before").content).toBe("none");
    expect(getComputedStyle(item, "::after").content).toBe("none");
  });

  it("centers avatar, time and chevron on a single-line row", () => {
    const root = mount(row());
    const item = q(root, ".x-item");
    const title = mid(box(q(item, ".x-item-title")));
    for (const part of [".x-avatar", "time", ".x-item-chevron"]) {
      expect(Math.abs(mid(box(q(item, part))) - title), part).toBeLessThanOrEqual(1);
    }
  });

  it("in a multiline item, centers the avatar and controls on the text and puts the value on the title line", () => {
    const root = mount(`
      <a class="x-item" href="#">
        <span class="x-avatar" data-size="2"><span class="x-avatar-fallback">AL</span></span>
        <span class="x-item-content">
          <span class="x-item-title">Alice Laurent</span>
          <span class="x-item-description">Line one<br>Line two<br>Line three</span>
        </span>
        <time>9:41</time>
        <span class="x-badge" data-size="1">3</span>
        <input type="checkbox" role="switch" class="x-switch" data-size="1" />
        <svg class="x-item-chevron" viewBox="0 0 16 16"></svg>
      </a>`);
    const item = q(root, ".x-item");
    const titleBox = box(q(item, ".x-item-title"));
    const itemBox = box(item);
    const textMid = mid(box(q(item, ".x-item-content")));
    // avatar and controls center on the whole text block, inside the row
    for (const part of [".x-avatar", ".x-badge", ".x-switch", ".x-item-chevron"]) {
      const partBox = box(q(item, part));
      expect(Math.abs(mid(partBox) - textMid), part).toBeLessThanOrEqual(1);
      expect(partBox.top, part).toBeGreaterThanOrEqual(itemBox.top - 0.01);
      expect(partBox.bottom, part).toBeLessThanOrEqual(itemBox.bottom + 0.01);
    }
    // the value sits on the title line
    expect(Math.abs(mid(box(q(item, "time"))) - mid(titleBox))).toBeLessThanOrEqual(1);
  });

  it("grows the row instead of letting an oversized leading visual escape it", () => {
    const root = mount(`
      <div class="x-item" data-size="1">
        <span class="x-avatar" data-size="5"><span class="x-avatar-fallback">AL</span></span>
        <span class="x-item-content"><span class="x-item-title">Row</span></span>
      </div>`);
    const item = q(root, ".x-item");
    const avatar = box(q(item, ".x-avatar"));
    const itemBox = box(item);
    expect(avatar.height).toBe(64);
    expect(itemBox.height).toBe(64);
    expect(avatar.top - itemBox.top).toBe(0);
  });

  it("keeps a single-line item centered even with a tall avatar", () => {
    const root = mount(row());
    const item = q(root, ".x-item");
    expect(Math.abs(mid(box(q(item, ".x-avatar"))) - mid(box(item)))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(mid(box(q(item, ".x-item-title"))) - mid(box(item)))).toBeLessThanOrEqual(1);
  });

});

describe("x-item sizes", () => {
  it("inherits its size from a sized list and lets data-size on the item override it", () => {
    const root = mount(`
      <div class="x-list" data-size="3">${row("", "", "3")}${row(`data-size="1"`, "", "1")}</div>`);
    const [large, small] = [...root.querySelectorAll(".x-item")].map((el) => getComputedStyle(el));
    expect(large.fontSize).toBe("16px");
    expect(large.minHeight).toBe("56px");
    expect(small.fontSize).toBe("12px");
    expect(small.minHeight).toBe("40px");
  });

  it("keeps one min height per size like iOS (40 / 48 / 56px), the avatar centered with an 8px inset", () => {
    const expected = { "1": [40, 8, 24], "2": [48, 8, 32], "3": [56, 8, 40] } as const;
    for (const [size, [height, padding, avatarSize]] of Object.entries(expected)) {
      const control = size === "3" ? "2" : "1";
      const root = mount(`
        <div class="x-list" data-size="${size}">
          ${row("", "", size)}
          <a class="x-item" href="#"><span class="x-item-content"><span class="x-item-title">Text only</span></span></a>
          <label class="x-item">
            <span class="x-item-content"><span class="x-item-title">Airplane mode</span></span>
            <input type="checkbox" role="switch" class="x-switch" data-size="${control}" />
          </label>
          <div class="x-item">
            <span class="x-item-content"><span class="x-item-title">Team</span></span>
            <button class="x-button" data-size="${control}">Invite</button>
          </div>
        </div>`);
      const items = [...root.querySelectorAll(".x-item")];
      for (const [i, item] of items.entries()) {
        expect(box(item).height, `size ${size} row ${i}`).toBe(height);
      }
      const avatar = box(q(root, ".x-avatar"));
      const first = box(items[0]);
      expect(Math.round(avatar.height), `size ${size}`).toBe(avatarSize);
      expect(Math.round(avatar.top - first.top), `size ${size}`).toBe(padding);
      expect(Math.round(first.bottom - avatar.bottom), `size ${size}`).toBe(padding);
      root.remove();
    }
  });

  it("grows a row with a description by the description's own height", () => {
    // text margin 11/44 of the row (10 / 12 / 14px) + title + 2/44 gap (2 / 2 / 3px) + description
    const heights = { "1": 10 + 16 + 2 + 16 + 10, "2": 12 + 20 + 2 + 16 + 12, "3": 14 + 24 + 3 + 20 + 14 } as const;
    for (const [size, height] of Object.entries(heights)) {
      const root = mount(`<div class="x-list" data-size="${size}"><a class="x-item" href="#"><span class="x-item-content"><span class="x-item-title">Storage</span><span class="x-item-description">Detail</span></span></a></div>`);
      // padding + title line + 2px gap + description line + padding
      expect(box(q(root, ".x-item")).height, `size ${size}`).toBe(height);
      root.remove();
    }
  });

  it("falls back to size 2 when nothing sets a size", () => {
    const root = mount(row());
    const style = getComputedStyle(q(root, ".x-item"));
    expect(style.fontSize).toBe("14px");
    expect(style.minHeight).toBe("48px");
  });
});

describe("x-item states", () => {
  it("rotates a placed chevron only inside an open details", () => {
    const root = mount(`
      <details>
        <summary class="x-item"><span class="x-item-content">Projects</span>
          <svg class="x-item-chevron" viewBox="0 0 16 16"></svg></summary>
      </details>`);
    const details = q(root, "details") as HTMLDetailsElement;
    const chevron = q(root, ".x-item-chevron");
    expect(getComputedStyle(chevron).rotate).toBe("none");
    details.open = true;
    chevron.style.transition = "none";
    expect(getComputedStyle(chevron).rotate).toBe("90deg");
  });

  it("shows a placed indicator only while the item's input is checked", () => {
    const root = mount(`
      <label class="x-item"><input class="x-item-input" type="radio" name="t" />
        <span class="x-item-content">Light</span><svg class="x-item-indicator"></svg></label>
      <label class="x-item"><input class="x-item-input" type="radio" name="t" checked />
        <span class="x-item-content">Dark</span><svg class="x-item-indicator"></svg></label>`);
    const [light, dark] = [...root.querySelectorAll(".x-item-indicator")].map((el) => getComputedStyle(el));
    expect(light.opacity).toBe("0");
    expect(dark.opacity).toBe("1");
  });

  it("lets an action button receive clicks over the item link", () => {
    const root = mount(`
      <div class="x-item">
        <span class="x-item-content"><a class="x-item-link x-item-title" href="#team">Design team</a></span>
        <button>Invite</button>
      </div>`);
    const item = q(root, ".x-item");
    const button = q(root, "button");
    const b = box(button);
    expect(document.elementFromPoint(b.left + b.width / 2, mid(b))).toBe(button);
    const r = box(item);
    expect(document.elementFromPoint(r.left + 40, mid(r))).toBe(q(root, ".x-item-link"));
  });

  it("marks selected and disabled items", () => {
    const root = mount(`
      <a class="x-item" href="#" aria-current="page"><span class="x-item-content">Home</span></a>
      <button class="x-item" disabled><span class="x-item-content">Transfer</span></button>`);
    const [selected, disabled] = [...root.querySelectorAll(".x-item")].map((el) => getComputedStyle(el));
    expect(selected.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(disabled.opacity).toBe("0.6");
    expect(disabled.pointerEvents).toBe("none");
  });
});

describe("x-list", () => {
  const list = (attrs: string) => mount(`<div class="x-card x-list" ${attrs}>${row()}${row()}</div>`);

  it("draws no separators unless asked", () => {
    const root = list("");
    const second = root.querySelectorAll(".x-item")[1];
    expect(getComputedStyle(second, "::after").content).toBe("none");
    expect(getComputedStyle(q(second as HTMLElement, ".x-item-content"), "::before").content).toBe("none");
  });

  it("starts inset separators at the content and full separators at the row edge", () => {
    const inset = list(`data-separators="inset"`);
    const [, second] = inset.querySelectorAll(".x-item");
    const content = q(second as HTMLElement, ".x-item-content");
    expect(getComputedStyle(content, "::before").content).toBe('""');
    expect(getComputedStyle(content, "::before").insetInlineStart).toBe("0px");
    expect(box(content).left).toBeGreaterThan(box(second).left + 20);
    inset.remove();

    const full = list(`data-separators="full"`);
    const [, fullSecond] = full.querySelectorAll(".x-item");
    const after = getComputedStyle(fullSecond, "::after");
    expect(after.content).toBe('""');
    expect(after.left).toBe("0px");
    expect(after.right).toBe("0px");
  });

  it("runs rows edge to edge inside a card", () => {
    const root = list("");
    const card = q(root, ".x-list");
    const item = q(root, ".x-item");
    expect(Math.round(box(item).left)).toBe(Math.round(box(card).left));
    expect(getComputedStyle(item).borderTopLeftRadius).toBe("0px");
  });

  it("uses heading tokens for the label and body tokens for the description", () => {
    const root = mount(`<h3 class="x-list-label">Network</h3><div class="x-list"></div><p class="x-list-description">Hint</p>`);
    const label = getComputedStyle(q(root, ".x-list-label"));
    const hint = getComputedStyle(q(root, ".x-list-description"));
    // --heading-line-height-2 is 18px; body --line-height-2 would be 20px
    expect(label.lineHeight).toBe("18px");
    expect(label.fontSize).toBe("14px");
    expect(label.fontWeight).toBe("500");
    // --font-size-1 / --line-height-1
    expect(hint.fontSize).toBe("12px");
    expect(hint.lineHeight).toBe("16px");
  });
});
