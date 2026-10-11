import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "./separator.css";

// Real browsers: separator geometry and color are computed styles.

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

const hr = (el: Element) => el.querySelector("hr")!;
const box = (el: Element) => el.getBoundingClientRect();

describe("x-separator horizontal", () => {
  it("a 1px line across its container by default", () => {
    const el = mount(`<div style="inline-size: 200px"><hr class="x-separator" /></div>`);

    expect(box(hr(el)).height).toBe(1);
    expect(box(hr(el)).width).toBe(200);
  });

  it.each([
    ["1", 16],
    ["2", 32],
    ["3", 64],
    ["4", 200],
  ])("data-size=%s: %ipx long", (size, length) => {
    const el = mount(`<div style="inline-size: 200px"><hr class="x-separator" data-size="${size}" /></div>`);
    expect(box(hr(el)).width).toBe(length);
  });

  it("neutral by default, the accent with data-accent", () => {
    const neutral = getComputedStyle(hr(mount(`<div><hr class="x-separator" /></div>`))).backgroundColor;
    host!.remove();
    const accent = getComputedStyle(hr(mount(`<div><hr class="x-separator" data-accent="mint" /></div>`))).backgroundColor;

    expect(neutral).not.toBe("rgba(0, 0, 0, 0)");
    expect(accent).not.toBe(neutral);
  });
});

describe("x-separator vertical", () => {
  const row = (attrs = "") =>
    mount(
      `<div style="display: flex; align-items: center; block-size: 80px"><span>A</span><hr class="x-separator" aria-orientation="vertical" ${attrs} /><span>B</span></div>`,
    );

  it("a 1px line the row's height by default", () => {
    const el = row();
    expect(box(hr(el)).width).toBe(1);
    expect(box(hr(el)).height).toBe(80);
  });

  it.each([
    ["1", 16],
    ["2", 32],
    ["3", 64],
  ])("data-size=%s: %ipx tall, centered in the row", (size, length) => {
    const el = row(`data-size="${size}"`);
    const line = box(hr(el));

    expect(line.height).toBe(length);
    expect(line.top - box(el).top).toBe((80 - length) / 2);
  });

  it("one line tall on its own", () => {
    const el = mount(`<div style="line-height: 20px"><hr class="x-separator" aria-orientation="vertical" /></div>`);
    expect(box(hr(el)).height).toBe(20);
  });
});
