import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "./button.css";

// Real Chromium: icon/label layout is geometry.

document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

function mount(attrs: string, label = "Go"): HTMLButtonElement {
  host = document.createElement("div");
  host.innerHTML = `<button class="unset x-button" ${attrs}><svg width="1.25em" height="1.25em"></svg><span>${label}</span></button>`;
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

    // 56px: 20px icon, 4px gap, 12px medium label on an 18px line
    expect(outer.height).toBe(56);
    expect(icon.width).toBe(20);
    expect(icon.height).toBe(20);
    expect(label.top - icon.bottom).toBe(4);
    expect(labelStyle.fontSize).toBe("12px");
    expect(labelStyle.lineHeight).toBe("18px");
    expect(labelStyle.fontWeight).toBe("500");
    expect(style.paddingLeft).toBe("14px");
    // centered both ways
    expect(icon.top - outer.top).toBe(outer.bottom - label.bottom);
    expect(Math.abs(middle(icon.left, icon.right) - middle(label.left, label.right))).toBeLessThanOrEqual(1);
  });

  it.each([
    ["1", 42, 15, "11px"],
    ["2", 56, 20, "12px"],
    ["3", 70, 25, "13px"],
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
    expect(label.left - outer.left).toBe(14);
  });

  it("truncates the label when the button is constrained", () => {
    const button = mount(
      `data-variant="soft" data-size="2" data-layout="stacked" style="width: 64px"`,
      "Notifications",
    );
    const label = button.querySelector("span")!;

    expect(box(button).height).toBe(56);
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
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
