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

const iconButton = (label: string) =>
  `<button class="unset x-button" data-variant="text" data-size="2" data-icon aria-label="${label}"><svg width="16" height="16"></svg></button>`;

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

  it("gives text buttons the full size box, so the padding stays even", () => {
    const el = mount(`<div class="x-group" data-variant="material"><button class="unset x-button" data-variant="text" data-size="2">Edit</button></div>`);
    const group = q(el, ".x-group");

    expect(box(group).height).toBe(40);
    expect(padding(group)).toEqual({ top: 4, bottom: 4, start: 4, end: 4 });
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
