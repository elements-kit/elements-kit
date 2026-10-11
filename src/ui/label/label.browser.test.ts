import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "../text-input/text-input.css";
import "../checkbox/checkbox.css";
import "./label.css";

// Real browsers: label typography is a computed style.

document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

function mount(html: string): HTMLElement {
  host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  return host.firstElementChild as HTMLElement;
}

const css = (el: Element) => getComputedStyle(el);

describe("x-label", () => {
  it.each([
    ["1", "12px"],
    ["2", "14px"],
    ["3", "16px"],
  ])("data-size=%s: %s, medium", (size, fontSize) => {
    const label = mount(`<label class="x-label" data-size="${size}">Email</label>`);

    expect(css(label).fontSize).toBe(fontSize);
    expect(css(label).fontWeight).toBe("500");
  });

  it("field (default): --space-2 above the control it labels", () => {
    const label = mount(`<div><label class="x-label" for="x">Email</label><input class="unset x-text-input" id="x" /></div>`).querySelector("label")!;
    const input = label.nextElementSibling!;
    expect(input.getBoundingClientRect().top - label.getBoundingClientRect().bottom).toBe(8);
  });

  it("group: regular weight, quieter, no margin", () => {
    const field = mount(`<div><div class="x-label">Message</div></div>`).firstElementChild!;
    const fieldColor = css(field).color;
    host!.remove();
    const group = mount(`<div><div class="x-label" data-variant="group">Message</div></div>`).firstElementChild!;

    expect(css(group).fontWeight).toBe("400");
    expect(css(group).color).not.toBe(fieldColor);
    expect(css(group).marginBottom).toBe("0px");
  });

  it("size 2 by default", () => {
    expect(css(mount(`<label class="x-label">Email</label>`)).fontSize).toBe("14px");
  });

  it("dims for a disabled control inside it", () => {
    const on = css(mount(`<label class="x-label"><input type="checkbox" /> Remember</label>`)).color;
    host!.remove();
    const off = css(mount(`<label class="x-label"><input type="checkbox" disabled /> Remember</label>`)).color;

    expect(off).not.toBe(on);
  });
});

describe("x-label around a checkbox", () => {
  const box = (el: Element) => el.getBoundingClientRect();

  it("regular weight, fit to its content, 0.5em gap", () => {
    const label = mount(`<label class="x-label"><input type="checkbox" class="x-checkbox" /><span>Remember me</span></label>`);
    const checkbox = box(label.querySelector("input")!);
    const text = box(label.querySelector("span")!);

    expect(css(label).fontWeight).toBe("400");
    expect(box(label).width).toBeLessThan(200);
    expect(text.left - checkbox.right).toBe(7); // 0.5em of 14px
  });

  it("the checkbox centered on the first line's capitals, also when the text wraps", () => {
    const label = mount(
      `<label class="x-label" style="inline-size: 120px"><input type="checkbox" class="x-checkbox" /><span>Push notifications on every device</span></label>`,
    );
    const checkbox = box(label.querySelector("input")!);
    const text = label.querySelector("span")!;
    const range = document.createRange();
    range.setStart(text.firstChild!, 0);
    range.setEnd(text.firstChild!, 1);
    const firstLine = range.getBoundingClientRect();

    expect(box(text).height).toBeGreaterThan(20);
    expect(Math.abs((checkbox.top + checkbox.bottom) / 2 - (firstLine.top + firstLine.bottom) / 2)).toBeLessThanOrEqual(1.5);
  });
});
