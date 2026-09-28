import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "./text-input.css";

// Real Chromium: the disabled / read-only state reaches the field and its affixes through the
// wrapper, so these assert computed styles.

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
  return host;
}

const q = (el: HTMLElement, selector: string) => el.querySelector(selector) as HTMLElement;
const style = (el: HTMLElement, pseudo?: string) => getComputedStyle(el, pseudo);

const field = (attrs: string, value = "") =>
  `<label class="x-text-input"><span data-affix>@</span><input ${attrs} value="${value}" placeholder="Name"><span data-affix>⌘</span></label>`;

describe("text input: disabled / read-only", () => {
  it("an enabled field keeps the text cursor on its affixes", () => {
    const el = mount(field(""));
    expect(style(q(el, "[data-affix]")).cursor).toBe("text");
    expect(style(q(el, "input")).cursor).toBe("text");
  });

  it("a disabled, empty field shows the disabled cursor on the wrapper and every affix", () => {
    const el = mount(field("disabled"));
    const wrapper = style(q(el, ".x-text-input")).cursor;
    expect(wrapper).not.toBe("text");
    for (const affix of el.querySelectorAll<HTMLElement>("[data-affix]")) {
      expect(style(affix).cursor).toBe(wrapper);
    }
  });

  it("a disabled field that holds text keeps the text cursor on its affixes", () => {
    const el = mount(field("disabled", "Ada"));
    expect(style(q(el, "[data-affix]")).cursor).toBe("text");
  });

  it("read-only counts as disabled", () => {
    const el = mount(field("readonly"));
    expect(style(q(el, "[data-affix]")).cursor).toBe(style(q(el, ".x-text-input")).cursor);
    expect(style(q(el, "[data-affix]")).cursor).not.toBe("text");
  });

  it("the field text dims and its placeholder fades", () => {
    const enabled = mount(field(""));
    const color = style(q(enabled, "input")).color;
    const placeholder = Number(style(q(enabled, "input"), "::placeholder").opacity);
    host?.remove();

    const disabled = mount(field("disabled"));
    const input = q(disabled, "input");
    expect(style(input).color).not.toBe(color);
    expect(style(input).webkitTextFillColor).toBe(style(input).color);
    expect(Number(style(input, "::placeholder").opacity)).toBeLessThan(placeholder);
  });

  it("the wrapper's tint follows the field", () => {
    const enabled = mount(field(""));
    const background = style(q(enabled, ".x-text-input")).backgroundColor;
    host?.remove();

    const disabled = mount(field("disabled"));
    expect(style(q(disabled, ".x-text-input")).backgroundColor).not.toBe(background);
  });

  it("a field nested in an affix doesn't inherit the outer field's cursor", () => {
    const el = mount(
      `<label class="x-text-input"><span data-affix><span class="x-text-input"><span data-inner>#</span><input></span></span><input disabled placeholder="Name"></label>`,
    );
    expect(style(q(el, "[data-inner]")).cursor).toBe("text");
  });
});

describe("text input: placeholder", () => {
  it("the surface variant colours a wrapped field's placeholder like a bare one", () => {
    const el = mount(`${field("")}<input class="x-text-input" placeholder="Name">`);
    const wrapped = style(q(el, "label input"), "::placeholder").color;
    const bare = style(el.querySelector("input.x-text-input") as HTMLElement, "::placeholder").color;
    expect(wrapped).toBe(bare);
  });

  it("the soft variant colours a wrapped field's placeholder like a bare one", () => {
    const el = mount(
      `<label class="x-text-input" data-variant="soft"><input placeholder="Name"></label><input class="x-text-input" data-variant="soft" placeholder="Name">`,
    );
    const wrapped = style(q(el, "label input"), "::placeholder");
    const bare = style(el.querySelector("input.x-text-input") as HTMLElement, "::placeholder");
    expect(wrapped.color).toBe(bare.color);
    expect(wrapped.opacity).toBe(bare.opacity);
  });
});
