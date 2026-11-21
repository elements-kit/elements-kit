import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../button/button.css";
import "../text-input/text-input.css";
import "./group.css";

// Real Chromium: seam side + flattened corners per group direction.

document.documentElement.dataset.neutral = "gray";

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

const btn = (label: string, dir = "") =>
  `<button class="unset x-button" data-variant="outline" data-size="2"${dir ? ` dir="${dir}"` : ""}>${label}</button>`;

/** Mounts `html` under a host with `dir`, returns the group's children. */
function mount(hostDir: "ltr" | "rtl", html: string): HTMLElement[] {
  host = document.createElement("div");
  host.dir = hostDir;
  host.innerHTML = html;
  document.body.append(host);
  return [...host.querySelector(".x-group")!.children] as HTMLElement[];
}

const radii = (el: Element) => {
  const s = getComputedStyle(el);
  return {
    tl: parseFloat(s.borderTopLeftRadius),
    tr: parseFloat(s.borderTopRightRadius),
    bl: parseFloat(s.borderBottomLeftRadius),
    br: parseFloat(s.borderBottomRightRadius),
  };
};

/** Asserts the first child is visually leftmost (LTR) or rightmost (RTL) with outer corners kept. */
function expectJoined(kids: HTMLElement[], visual: "ltr" | "rtl") {
  const [first, mid, last] = kids;
  const r1 = first.getBoundingClientRect();
  const r2 = mid.getBoundingClientRect();
  const r3 = last.getBoundingClientRect();

  // 1px borders overlap: neighbours share an edge pixel
  if (visual === "ltr") {
    expect(Math.round(r2.left)).toBe(Math.round(r1.right) - 1);
    expect(Math.round(r3.left)).toBe(Math.round(r2.right) - 1);
  } else {
    expect(Math.round(r2.right)).toBe(Math.round(r1.left) + 1);
    expect(Math.round(r3.right)).toBe(Math.round(r2.left) + 1);
  }

  const outerFirst = visual === "ltr" ? "tl" : "tr";
  const innerFirst = visual === "ltr" ? "tr" : "tl";
  expect(radii(first)[outerFirst]).toBeGreaterThan(0);
  expect(radii(first)[innerFirst]).toBe(0);
  expect(radii(mid)).toEqual({ tl: 0, tr: 0, bl: 0, br: 0 });
  expect(radii(last)[innerFirst === "tr" ? "tl" : "tr"]).toBe(0);
  expect(radii(last)[outerFirst === "tl" ? "tr" : "tl"]).toBeGreaterThan(0);
}

const group = (inner: string, dir = "") =>
  `<div class="x-group"${dir ? ` dir="${dir}"` : ""}>${inner}</div>`;

describe("x-group direction", () => {
  it("joins left-to-right in an LTR page", () => {
    expectJoined(mount("ltr", group(btn("A") + btn("B") + btn("C"))), "ltr");
  });

  it("joins right-to-left in an RTL page", () => {
    expectJoined(mount("rtl", group(btn("A") + btn("B") + btn("C"))), "rtl");
  });

  it("keeps RTL seams when children carry dir=ltr or dir=auto", () => {
    const kids = mount("rtl", group(btn("A", "ltr") + btn("B", "auto") + btn("C", "ltr")));
    expectJoined(kids, "rtl");
  });

  it("treats a dir=ltr group inside an RTL page as LTR", () => {
    expectJoined(mount("rtl", group(btn("A") + btn("B") + btn("C"), "ltr")), "ltr");
  });

  it("treats a dir=rtl group inside an LTR page as RTL", () => {
    expectJoined(mount("ltr", group(btn("A") + btn("B") + btn("C"), "rtl")), "rtl");
  });

  it("leaves material children unjoined in an RTL page", () => {
    const [a, b] = mount(
      "rtl",
      `<div class="x-group" data-variant="material">${btn("A")}${btn("B")}</div>`,
    );
    for (const el of [a, b]) {
      const s = getComputedStyle(el);
      expect(s.marginLeft).toBe("0px");
      expect(s.marginRight).toBe("0px");
      expect(Object.values(radii(el)).every((r) => r > 0)).toBe(true);
    }
  });

  it("follows the nearest dir ancestor (LTR wrapper inside an RTL page)", () => {
    const kids = mount(
      "rtl",
      `<div dir="ltr">${group(btn("A") + btn("B") + btn("C"))}</div>`,
    );
    expectJoined(kids, "ltr");
  });
});
