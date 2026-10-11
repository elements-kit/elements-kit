import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "../button/button.css";
import "../segmented-control/segmented-control.css";
import "../text-input/text-input.css";
import "./group.css";

// Real Chromium: the material capsule is geometry + computed styles.

// color context on the root, like an app: tokens declared on :root (--shadow-3) resolve against it
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

const q = (root: ParentNode, selector: string) =>
  root.querySelector(selector) as HTMLElement;

const box = (el: Element) => el.getBoundingClientRect();

// a real Material Symbols glyph, so failure screenshots show the icon
const SHARE = `<svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M686-80q-47.5 0-80.75-33.25T572-194q0-8 5-34L278-403q-16.28 17.34-37.64 27.17Q219-366 194-366q-47.5 0-80.75-33T80-480q0-48 33.25-81T194-594q24 0 45 9.3 21 9.29 37 25.7l301-173q-2-8-3.5-16.5T572-766q0-47.5 33.25-80.75T686-880q47.5 0 80.75 33.25T800-766q0 47.5-33.25 80.75T686-652q-23.27 0-43.64-9Q622-670 606-685L302-516q3 8 4.5 17.5t1.5 18q0 8.5-1 16t-3 15.5l303 173q16-15 36.09-23.5 20.1-8.5 43.07-8.5Q734-308 767-274.75T800-194q0 47.5-33.25 80.75T686-80Z" /></svg>`;

const iconButton = (label: string) =>
  `<button class="unset x-button" data-variant="borderless" data-size="2" data-icon aria-label="${label}">${SHARE}</button>`;

/** Gap between the capsule edge and its first/last child, per side. */
function padding(group: Element) {
  const outer = box(group);
  const first = box(group.firstElementChild!);
  const last = box(group.lastElementChild!);
  return {
    top: Math.round(first.top - outer.top),
    bottom: Math.round(outer.bottom - first.bottom),
    start: Math.round(first.left - outer.left),
    end: Math.round(outer.right - last.right),
  };
}

describe("x-group data-variant=material", () => {
  it("is a 40px capsule: size-2 buttons with 4px on every side", () => {
    const el = mount(`<div class="x-group" data-variant="material">${iconButton("Share")}${iconButton("More")}</div>`);
    const group = q(el, ".x-group");

    expect(box(group).height).toBe(40);
    expect(padding(group)).toEqual({ top: 4, bottom: 4, start: 4, end: 4 });
    for (const button of group.children) {
      expect(box(button).width).toBe(32);
      expect(box(button).height).toBe(32);
    }
  });

  it("holds a borderless label button with even padding: the label keeps the borderless 12px", () => {
    const el = mount(`<div class="x-group" data-variant="material"><button class="unset x-button" data-variant="borderless" data-size="2">Edit</button></div>`);
    const group = q(el, ".x-group");
    const button = q(el, ".x-button");
    const range = document.createRange();
    range.selectNodeContents(button);
    const label = range.getBoundingClientRect();

    expect(box(group).height).toBe(40);
    expect(padding(group)).toEqual({ top: 4, bottom: 4, start: 4, end: 4 });
    expect(label.left - box(button).left).toBeCloseTo(12, 0);
    expect(box(button).right - label.right).toBeCloseTo(12, 0);
  });

  describe.each(["none", "small", "medium", "large", "pill"])("data-radius=%s", (radius) => {
    it.each([1, 2, 3, 4])("size %s children: h + 8px tall, 4px in, corners concentric", (size) => {
      host = document.createElement("div");
      host.dataset.radius = radius;
      host.innerHTML = `<div class="x-group" data-variant="material"><button class="unset x-button" data-variant="borderless" data-size="${size}" data-icon aria-label="A">${SHARE}</button><button class="unset x-button" data-variant="borderless" data-size="${size}">Edit</button></div>`;
      document.body.append(host);
      const group = q(host, ".x-group");
      const button = group.firstElementChild!;
      const px = (v: string) => parseFloat(v);
      const standalone = document.createElement("button");
      standalone.className = "unset x-button";
      standalone.dataset.size = String(size);
      host.append(standalone);

      expect(box(group).height).toBe({ 1: 24, 2: 32, 3: 40, 4: 48 }[size]! + 8);
      expect(padding(group)).toEqual({ top: 4, bottom: 4, start: 4, end: 4 });
      // children keep their size's own radius; the capsule adds its 4px padding
      expect(getComputedStyle(button).borderTopLeftRadius).toBe(getComputedStyle(standalone).borderTopLeftRadius);
      expect(px(getComputedStyle(group).borderTopLeftRadius)).toBe(px(getComputedStyle(button).borderTopLeftRadius) + 4);
    });
  });

  it("does not join its children like a bare group", () => {
    const el = mount(`
      <div class="x-group" id="joined">${iconButton("A")}${iconButton("B")}</div>
      <div class="x-group" id="material" data-variant="material">${iconButton("A")}${iconButton("B")}</div>`);
    const joined = getComputedStyle(q(el, "#joined").lastElementChild!);
    const material = getComputedStyle(q(el, "#material").lastElementChild!);

    expect(joined.marginLeft).toBe("-1px");
    expect(material.marginLeft).toBe("0px");
    expect(material.clipPath).toBe("none");
    // own corners: the seam side stays rounded
    expect(material.borderStartStartRadius).not.toBe("0px");
    expect(joined.borderStartStartRadius).toBe("0px");
  });

  it("has its own background and shadow", () => {
    const style = getComputedStyle(q(mount(`<div class="x-group" data-variant="material">${iconButton("A")}</div>`), ".x-group"));

    expect(style.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(style.boxShadow).not.toBe("none");
  });

  it("lets a text input fill the capsule and use it as its background", () => {
    const el = mount(`
      <div class="x-group" data-variant="material" style="inline-size: 200px">
        <div class="x-text-input" data-variant="soft" data-size="2"><input class="unset" aria-label="Search" /></div>
      </div>`);
    const group = q(el, ".x-group");
    const field = q(el, ".x-text-input");

    expect(box(field).width).toBe(box(group).width - 8);
    expect(getComputedStyle(field).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("lets a segmented control use the capsule as its track", () => {
    const el = mount(`
      <div class="x-group" data-variant="material">
        <div class="unset x-segmented-control" data-variant="soft" data-size="2" role="radiogroup" aria-label="View">
          <label><input type="radio" name="view" checked /><span>Day</span></label>
          <label><input type="radio" name="view" /><span>Week</span></label>
        </div>
      </div>`);
    const style = getComputedStyle(q(el, ".x-segmented-control"));

    expect(box(q(el, ".x-group")).height).toBe(40);
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(style.backgroundImage).toBe("none");
  });

  it("moves a focused field's ring onto the capsule", () => {
    const el = mount(`
      <div class="x-group" data-variant="material">
        <div class="x-text-input" data-variant="soft" data-size="2"><input class="unset" aria-label="Search" /></div>
      </div>
      <div class="x-group" data-variant="material">${iconButton("Share")}</div>`);
    const [fieldGroup, buttonGroup] = el.querySelectorAll<HTMLElement>(".x-group");

    expect(getComputedStyle(fieldGroup).outlineStyle).toBe("none");

    q(fieldGroup, "input").focus();
    expect(getComputedStyle(fieldGroup).outlineStyle).toBe("solid");
    expect(getComputedStyle(q(fieldGroup, ".x-text-input")).outlineStyle).toBe("none");

    q(buttonGroup, "button").focus();
    expect(getComputedStyle(fieldGroup).outlineStyle).toBe("none");
    expect(getComputedStyle(buttonGroup).outlineStyle).toBe("none");
  });
});
