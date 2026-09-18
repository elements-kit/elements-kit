import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "../styles/palette/red.css";
import "../styles/accent/red.css";
import "../card/card.css";
import "../label/label.css";
import "../separator/separator.css";
import "./menu.css";

// Real browsers: menu geometry and highlight are computed styles (Radix Themes' base menu).

document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

const clear = "rgba(0, 0, 0, 0)";
const box = (el: Element) => el.getBoundingClientRect();
const css = (el: Element) => getComputedStyle(el);

function menu(attrs = `class="x-card x-menu" data-variant="elevated"`): HTMLElement {
  host = document.createElement("div");
  host.innerHTML = `<div ${attrs} role="menu" style="inline-size: 220px">
    <div class="x-label" data-variant="group">Actions</div>
    <button class="unset x-menu-item" role="menuitem">Edit <span class="x-menu-trailing">⌘E</span></button>
    <button class="unset x-menu-item" role="menuitem">Share</button>
    <hr class="x-separator" />
    <button class="unset x-menu-item" role="menuitem" data-accent="red">Delete</button>
    <button class="unset x-menu-item" role="menuitem" disabled>Archive</button>
  </div>`;
  document.body.append(host);
  return host.firstElementChild as HTMLElement;
}

const items = (el: Element) => [...el.querySelectorAll<HTMLElement>(".x-menu-item")];

async function focus(item: HTMLElement) {
  item.focus();
  await userEvent.tab({ shift: true });
  await userEvent.tab();
  expect(document.activeElement).toBe(item);
}

describe("x-menu size 2 (default)", () => {
  it("8px content padding, radius-4; items 32px tall with 12px side padding and radius-2", () => {
    const el = menu();
    const [edit, share] = items(el);

    expect(css(el).paddingTop).toBe("8px");
    expect(css(el).borderTopLeftRadius).toBe("8px"); // --radius-4
    expect(box(edit).left - box(el).left).toBe(8);
    expect(box(el).right - box(edit).right).toBe(8);
    expect(box(edit).height).toBe(32);
    expect(css(edit).paddingLeft).toBe("12px");
    expect(css(edit).borderTopLeftRadius).toBe("4px"); // --radius-2
    expect(css(edit).fontWeight).toBe("400");
    expect(css(edit).fontSize).toBe("14px");
    expect(box(share).top).toBe(box(edit).bottom);
  });

  it("the trailing part sits at the item's end", () => {
    const edit = items(menu())[0]!;
    const shortcut = box(edit.querySelector(".x-menu-trailing")!);

    expect(shortcut.right).toBeCloseTo(box(edit).right - 12, 0);
  });

  it("the separator is inset to the items' text, 8px from them", () => {
    const el = menu();
    const share = items(el)[1]!;
    const hr = box(el.querySelector("hr")!);

    expect(hr.left).toBe(box(share).left + 12);
    expect(hr.right).toBe(box(share).right - 12);
    expect(hr.top - box(share).bottom).toBe(8);
  });

  it("the label is quieter, regular weight, item height and padding", () => {
    const el = menu();
    const label = el.querySelector(".x-label")!;

    expect(box(label).height).toBe(32);
    expect(css(label).paddingLeft).toBe("12px");
    expect(css(label).fontWeight).toBe("400");
    expect(css(label).color).not.toBe(css(items(el)[1]!).color);
  });
});

describe("x-menu size 1", () => {
  it("4px content padding; items 24px tall with 8px side padding", () => {
    const el = menu(`class="x-card x-menu" data-variant="elevated" data-size="1"`);
    const edit = items(el)[0]!;

    expect(css(el).paddingTop).toBe("4px");
    expect(box(edit).height).toBe(24);
    expect(css(edit).paddingLeft).toBe("8px");
    expect(css(edit).fontSize).toBe("12px");
    expect(css(edit).lineHeight).toBe("16px");
  });
});

describe("x-menu highlight", () => {
  it("solid (default): no fill at rest; keyboard focus fills with --accent-9 and contrast text", async () => {
    const el = menu();
    const edit = items(el)[0]!;
    const rest = css(edit).color;
    expect(css(edit).backgroundColor).toBe(clear);

    await focus(edit);
    expect(css(edit).backgroundColor).not.toBe(clear);
    expect(css(edit).color).not.toBe(rest);
    expect(css(edit.querySelector(".x-menu-trailing")!).color).toBe(css(edit).color);
  });

  it("data-highlighted highlights too (a roving script)", () => {
    const edit = items(menu())[0]!;
    edit.dataset.highlighted = "";
    expect(css(edit).backgroundColor).not.toBe(clear);
  });

  it("soft: a tint, the text keeps its color", async () => {
    const el = menu(`class="x-card x-menu" data-variant="elevated" data-highlight="soft"`);
    const edit = items(el)[0]!;
    const rest = css(edit).color;

    await focus(edit);
    expect(css(edit).backgroundColor).not.toBe(clear);
    expect(css(edit).color).toBe(rest);
  });

  it("data-accent: accent text, highlighted in that accent", () => {
    const el = menu();
    const [edit, , del] = items(el);
    expect(css(del!).color).not.toBe(css(edit!).color);

    edit!.dataset.highlighted = "";
    del!.dataset.highlighted = "";
    expect(css(del!).backgroundColor).not.toBe(css(edit!).backgroundColor);
  });

  it("disabled: dimmed, never highlighted", () => {
    const archive = items(menu())[3]!;
    archive.dataset.highlighted = "";
    expect(css(archive).backgroundColor).toBe(clear);
  });
});

describe("x-menu without a card", () => {
  it("paints a solid panel with a shadow", () => {
    const el = menu(`class="x-menu"`);
    expect(css(el).backgroundColor).not.toBe(clear);
    expect(css(el).boxShadow).not.toBe("none");
    expect(css(el).paddingTop).toBe("8px");
  });
});
