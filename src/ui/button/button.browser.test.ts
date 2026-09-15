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

function mount(attrs: string, label = "Share"): HTMLButtonElement {
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
});

describe("x-button icon and label", () => {
  it("sits on one row by default, at the size's height", () => {
    const { outer, icon, label } = parts(mount(`data-variant="soft" data-size="2"`));

    expect(outer.height).toBe(32);
    expect(icon.right).toBeLessThanOrEqual(label.left);
    expect(Math.abs(middle(icon.top, icon.bottom) - middle(label.top, label.bottom))).toBeLessThanOrEqual(1);
  });
});

describe("x-button data-layout=stacked", () => {
  it("matches the iOS control-group item at size 2", () => {
    const { outer, icon, label, labelStyle } = parts(
      mount(`data-variant="soft" data-size="2" data-layout="stacked"`),
    );

    // 56px tall: 22px icon, 5px gap, 12px medium label on an 18px line, centered
    expect(outer.height).toBe(56);
    expect(icon.width).toBe(22);
    expect(icon.height).toBe(22);
    expect(Math.round(label.top - icon.bottom)).toBe(5);
    expect(labelStyle.fontSize).toBe("12px");
    expect(labelStyle.lineHeight).toBe("18px");
    expect(labelStyle.fontWeight).toBe("500");
    expect(Math.abs(icon.top - outer.top - (outer.bottom - label.bottom))).toBeLessThanOrEqual(1);
    expect(Math.abs(middle(icon.left, icon.right) - middle(label.left, label.right))).toBeLessThanOrEqual(1);
    // 4px inline padding around the wider child
    expect(Math.round(outer.width - label.width)).toBe(8);
  });

  it.each([
    ["1", 42, 16.5],
    ["2", 56, 22],
    ["3", 70, 27.5],
    ["4", 84, 33],
  ])("size %s: %ipx tall with a %ipx icon", (size, height, iconSize) => {
    const { outer, icon } = parts(mount(`data-variant="soft" data-size="${size}" data-layout="stacked"`));

    expect(outer.height).toBe(height);
    expect(icon.width).toBe(iconSize);
  });

  it("never shrinks the label below 10px", () => {
    const { labelStyle } = parts(mount(`data-variant="soft" data-size="1" data-layout="stacked"`));

    expect(labelStyle.fontSize).toBe("10px");
  });

  it("truncates a long label instead of wrapping", () => {
    const button = mount(
      `data-variant="soft" data-size="2" data-layout="stacked" style="width: 64px"`,
      "Notifications",
    );
    const label = button.querySelector("span")!;

    expect(box(button).height).toBe(56);
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
  });

  it("text variant: same icon and label, 6px block padding", () => {
    const { outer, icon, label, labelStyle } = parts(
      mount(`data-variant="text" data-size="2" data-layout="stacked"`),
    );

    expect(icon.bottom).toBeLessThanOrEqual(label.top);
    expect(icon.width).toBe(22);
    expect(labelStyle.fontSize).toBe("12px");
    expect(Math.round(icon.top - outer.top)).toBe(6);
  });

  it("lets authors size the icon", () => {
    const { icon } = parts(
      mount(`data-variant="soft" data-size="2" data-layout="stacked" style="--button-stacked-icon-size: 24px"`),
    );

    expect(icon.width).toBe(24);
  });
});
