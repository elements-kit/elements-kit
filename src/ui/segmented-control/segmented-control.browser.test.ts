import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "./segmented-control.css";

// Real Chromium: icon/label layout is geometry.

document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

function mount(attrs: string, labels = ["List", "Grid"]): HTMLElement {
  host = document.createElement("div");
  const segments = labels
    .map(
      (label, i) =>
        `<label><input type="radio" name="view" ${i === 0 ? "checked" : ""} /><svg width="1.25em" height="1.25em"></svg><span>${label}</span></label>`,
    )
    .join("");
  host.innerHTML = `<div class="unset x-segmented-control" ${attrs} role="radiogroup" aria-label="View">${segments}</div>`;
  document.body.append(host);
  return host.querySelector(".x-segmented-control")!;
}

const box = (el: Element) => el.getBoundingClientRect();
const middle = (a: number, b: number) => (a + b) / 2;

describe("x-segmented-control icons", () => {
  it("puts the icon before the label on one row, at the size's height", () => {
    const control = mount(`data-size="2"`);
    const icon = box(control.querySelector("svg")!);
    const label = box(control.querySelector("span")!);

    expect(box(control).height).toBe(32);
    expect(icon.right).toBeLessThanOrEqual(label.left);
    expect(Math.abs(middle(icon.top, icon.bottom) - middle(label.top, label.bottom))).toBeLessThanOrEqual(1);
  });
});

describe("x-segmented-control data-layout=stacked", () => {
  it("matches the iOS control-group item at size 2", () => {
    const control = mount(`data-size="2" data-layout="stacked"`);
    const segment = control.querySelector("label")!;
    const icon = box(segment.querySelector("svg")!);
    const label = box(segment.querySelector("span")!);
    const labelStyle = getComputedStyle(segment.querySelector("span")!);

    // 56px tall: 22px icon, 5px gap, 12px medium label on an 18px line, centered
    expect(box(control).height).toBe(56);
    expect(icon.width).toBe(22);
    expect(Math.round(label.top - icon.bottom)).toBe(5);
    expect(labelStyle.fontSize).toBe("12px");
    expect(labelStyle.lineHeight).toBe("18px");
    expect(labelStyle.fontWeight).toBe("500");
    expect(Math.abs(icon.top - box(segment).top - (box(segment).bottom - label.bottom))).toBeLessThanOrEqual(1);
    expect(Math.abs(middle(icon.left, icon.right) - middle(label.left, label.right))).toBeLessThanOrEqual(1);
  });

  it.each([
    ["1", 42, 16.5],
    ["2", 56, 22],
    ["3", 70, 27.5],
  ])("size %s: %ipx tall with a %ipx icon", (size, height, iconSize) => {
    const control = mount(`data-size="${size}" data-layout="stacked"`);

    expect(box(control).height).toBe(height);
    expect(box(control.querySelector("svg")!).width).toBe(iconSize);
  });

  it("keeps segments equal width and truncates long labels", () => {
    const control = mount(`data-size="2" data-layout="stacked" style="width: 160px"`, ["Home", "Notifications"]);
    const [first, second] = control.querySelectorAll("label");
    const long = second.querySelector("span")!;

    expect(box(first).width).toBeCloseTo(box(second).width, 0);
    expect(long.scrollWidth).toBeGreaterThan(long.clientWidth);
  });
});
