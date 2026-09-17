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
const separator = (control: Element) =>
  getComputedStyle(control.querySelectorAll("label")[1], "::after").content;

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

describe("x-segmented-control data-separators", () => {
  it("draws separators by default and removes them with none", () => {
    expect(separator(mount(`data-size="2"`))).not.toBe("none");
    expect(separator(mount(`data-size="2" data-separators="none"`))).toBe("none");
  });
});

describe("x-segmented-control data-layout=stacked", () => {
  it("puts the icon over the label inside an inset highlight, at size 2", () => {
    const control = mount(`data-size="2" data-layout="stacked"`);
    const segment = control.querySelector("label")!;
    const inset = parseFloat(getComputedStyle(segment).borderTopWidth);
    const highlight = { top: box(segment).top + inset, bottom: box(segment).bottom - inset };
    const icon = box(segment.querySelector("svg")!);
    const label = box(segment.querySelector("span")!);
    const labelStyle = getComputedStyle(segment.querySelector("span")!);

    // 58px: a 54px highlight 2px inside the track, 24px icon, 1px gap, --font-size-0 caption on --line-height-1
    expect(box(control).height).toBe(58);
    expect(inset).toBe(2);
    expect(getComputedStyle(control, "::after").top).toBe("2px");
    expect(icon.width).toBe(24);
    expect(label.top - icon.bottom).toBe(1);
    expect(labelStyle.fontSize).toBe("10px");
    expect(labelStyle.lineHeight).toBe("16px");
    expect(labelStyle.fontWeight).toBe("500");
    // centered in the highlight both ways
    expect(icon.top - highlight.top).toBeCloseTo(highlight.bottom - label.bottom, 1);
    expect(Math.abs(middle(icon.left, icon.right) - middle(label.left, label.right))).toBeLessThanOrEqual(1);
  });

  it.each([
    ["1", 43.5, 18, "10px"],
    ["2", 58, 24, "10px"],
    ["3", 72.5, 30, "12px"],
  ])("size %s: %ipx tall with a %ipx icon and a %s label", (size, height, iconSize, labelSize) => {
    const control = mount(`data-size="${size}" data-layout="stacked"`);

    expect(box(control).height).toBe(height);
    expect(box(control.querySelector("svg")!).width).toBe(iconSize);
    expect(getComputedStyle(control.querySelector("span")!).fontSize).toBe(labelSize);
  });

  it("has no separators", () => {
    expect(separator(mount(`data-size="2" data-layout="stacked"`))).toBe("none");
  });

  it("fits its container: equal-width segments, long labels truncate", () => {
    const control = mount(`data-size="2" data-layout="stacked" style="width: 160px"`, ["Home", "Notifications"]);
    const [first, second] = control.querySelectorAll("label");
    const long = second.querySelector("span")!;

    expect(box(control).width).toBe(160);
    expect(box(first).width).toBeCloseTo(box(second).width, 0);
    expect(long.scrollWidth).toBeGreaterThan(long.clientWidth);
  });
});
