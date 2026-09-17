import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "./button.css";

// Real Chromium: icon/label layout is geometry.

// real Material Symbols glyphs, so failure screenshots show the icons
const SHARE = `<svg width="1.25em" height="1.25em" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M686-80q-47.5 0-80.75-33.25T572-194q0-8 5-34L278-403q-16.28 17.34-37.64 27.17Q219-366 194-366q-47.5 0-80.75-33T80-480q0-48 33.25-81T194-594q24 0 45 9.3 21 9.29 37 25.7l301-173q-2-8-3.5-16.5T572-766q0-47.5 33.25-80.75T686-880q47.5 0 80.75 33.25T800-766q0 47.5-33.25 80.75T686-652q-23.27 0-43.64-9Q622-670 606-685L302-516q3 8 4.5 17.5t1.5 18q0 8.5-1 16t-3 15.5l303 173q16-15 36.09-23.5 20.1-8.5 43.07-8.5Q734-308 767-274.75T800-194q0 47.5-33.25 80.75T686-80Z" /></svg>`;
const BACK = `<svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="m113-480 315 315q11 11 11 27.5T428-109q-12 12-28.5 12T371-109L42-438q-9-9-13-20t-4-22q0-11 4-22t13-20l330-330q12-12 28-11.5t28 12.5q11 12 11.5 28T428-795L113-480Z" /></svg>`;
const BACK_NEW = `<svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="m368-480 315 315q11 11 11 27.5T683-109q-12 12-28.5 12T626-109L297-438q-9-9-13-20t-4-22q0-11 4-22t13-20l330-330q12-12 28-11.5t28 12.5q11 12 11.5 28T683-795L368-480Z" /></svg>`;

document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

function mount(attrs: string, label = "Go", icon = SHARE): HTMLButtonElement {
  host = document.createElement("div");
  host.innerHTML = `<button class="unset x-button" ${attrs}>${icon}<span>${label}</span></button>`;
  document.body.append(host);
  return host.querySelector("button")!;
}

const box = (el: Element) => el.getBoundingClientRect();
const middle = (a: number, b: number) => (a + b) / 2;
const parts = (button: HTMLButtonElement) => ({
  outer: box(button),
  icon: box(button.querySelector("svg")!),
  label: box(button.querySelector("span")!),
  labelStyle: getComputedStyle(button.querySelector("span")!),
  style: getComputedStyle(button),
});

describe("x-button icon and label", () => {
  it("sits on one row by default, at the size's height", () => {
    const { outer, icon, label } = parts(mount(`data-variant="soft" data-size="2"`, "Share"));

    expect(outer.height).toBe(32);
    expect(icon.right).toBeLessThanOrEqual(label.left);
    expect(Math.abs(middle(icon.top, icon.bottom) - middle(label.top, label.bottom))).toBeLessThanOrEqual(1);
  });
});

describe("x-button data-layout=stacked", () => {
  it("puts the icon over the label, centered, at size 2", () => {
    const { outer, icon, label, labelStyle, style } = parts(
      mount(`data-variant="soft" data-size="2" data-layout="stacked"`),
    );

    // 56px: 20px icon, 4px gap, --font-size-1 medium label on --line-height-1
    expect(outer.height).toBe(56);
    expect(icon.width).toBe(20);
    expect(icon.height).toBe(20);
    expect(label.top - icon.bottom).toBe(4);
    expect(labelStyle.fontSize).toBe("12px");
    expect(labelStyle.lineHeight).toBe("16px");
    expect(labelStyle.fontWeight).toBe("500");
    expect(style.paddingLeft).toBe("8px");
    // centered both ways
    expect(icon.top - outer.top).toBe(outer.bottom - label.bottom);
    expect(Math.abs(middle(icon.left, icon.right) - middle(label.left, label.right))).toBeLessThanOrEqual(1);
  });

  it.each([
    ["1", 42, 15, "12px"],
    ["2", 56, 20, "12px"],
    ["3", 70, 25, "14px"],
    ["4", 84, 30, "14px"],
  ])("size %s: %ipx square with a %ipx icon and a %s label", (size, height, iconSize, labelSize) => {
    const { outer, icon, labelStyle } = parts(
      mount(`data-variant="soft" data-size="${size}" data-layout="stacked"`),
    );

    expect(outer.height).toBe(height);
    expect(outer.width).toBe(height);
    expect(icon.width).toBe(iconSize);
    expect(labelStyle.fontSize).toBe(labelSize);
  });

  it("widens for a longer label, never taller than wide", () => {
    const { outer, label } = parts(
      mount(`data-variant="soft" data-size="2" data-layout="stacked"`, "Notifications"),
    );

    expect(outer.height).toBe(56);
    expect(outer.width).toBeGreaterThan(56);
    expect(label.left - outer.left).toBe(8);
  });

  it("wraps the label when the button is constrained, growing taller", () => {
    const button = mount(
      `data-variant="soft" data-size="2" data-layout="stacked" style="width: 80px"`,
      "Photo Library",
    );
    const label = button.querySelector("span")!;

    // two 16px lines under the 20px icon and 4px gap, 4px above and below
    expect(box(label).height).toBe(32);
    expect(box(button).height).toBe(64);
    expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
  });

  it("text variant: the kit's text padding, 51px square at size 2", () => {
    const { outer, icon, labelStyle, style } = parts(
      mount(`data-variant="text" data-size="2" data-layout="stacked"`),
    );

    expect(outer.height).toBe(51);
    expect(outer.width).toBe(51);
    expect(icon.width).toBe(20);
    expect(labelStyle.fontSize).toBe("12px");
    expect(style.paddingTop).toBe("4px");
    expect(style.paddingLeft).toBe("8px");
    // bleeds by its padding, like other text buttons
    expect(style.marginLeft).toBe("-8px");
  });
});

describe("x-button data-back", () => {
  it.each(["1", "2", "3", "4"])("size %s: the chevron is one text line tall, right against the label", (size) => {
    const { icon, label, style } = parts(mount(`data-variant="text" data-size="${size}" data-back`, "Mailboxes", BACK));
    const line = parseFloat(style.lineHeight);

    expect(icon.width).toBe(line);
    expect(icon.height).toBe(line);
    expect(label.left - icon.right).toBe(0);
    expect(Math.abs(middle(icon.top, icon.bottom) - middle(label.top, label.bottom))).toBeLessThanOrEqual(1);
  });

  it("text variant: the chevron's leading edge is the content edge (the bleed keeps it on the layout edge)", () => {
    const button = mount(`data-variant="text" data-size="2" data-back`, "Mailboxes", BACK);
    const { icon } = parts(button);

    expect(icon.left).toBe(box(host!).left);
  });

  it("rtl: the chevron mirrors and leads on the right, on the content edge", () => {
    host = document.createElement("div");
    host.dir = "rtl";
    host.style.cssText = "display: flex";
    host.innerHTML = `<button class="unset x-button" data-variant="text" data-size="2" data-back>${BACK}<span>Mailboxes</span></button>`;
    document.body.append(host);
    const button = host.querySelector("button")!;
    const { icon, label } = parts(button);

    expect(getComputedStyle(button.querySelector("svg")!).scale).toBe("-1 1");
    expect(icon.left).toBeGreaterThanOrEqual(label.right);
    expect(icon.right).toBe(box(host).right);
  });

  it("ltr: the chevron is not mirrored", () => {
    expect(getComputedStyle(mount(`data-variant="text" data-size="2" data-back`, "Go", BACK).querySelector("svg")!).scale).toBe("none");
  });

  it.each(["borderless", "text"])("%s data-icon: a chevron-only button keeps its square and centers the chevron", (variant) => {
    host = document.createElement("div");
    host.innerHTML = `<button class="unset x-button" data-variant="${variant}" data-size="2" data-back data-icon aria-label="Back">${BACK_NEW}</button>`;
    document.body.append(host);
    const button = host.querySelector("button")!;
    const outer = box(button);
    const icon = box(button.querySelector("svg")!);

    expect(outer.width).toBe(outer.height);
    expect(icon.height).toBe(20);
    expect(icon.left - outer.left).toBe(outer.right - icon.right);
    expect(icon.top - outer.top).toBe(outer.bottom - icon.bottom);
  });
});
