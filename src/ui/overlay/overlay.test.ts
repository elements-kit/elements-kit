import { describe, expect, it } from "vitest";
import { AUTO, OverlayBox } from "./overlay.ts";

/** A rect-mocked `.x-overlay` dialog (happy-dom has no layout). */
function overlayEl(w = 200, h = 120, x = 100, y = 80): HTMLDialogElement {
  const el = document.createElement("dialog");
  el.className = "unset x-overlay";
  el.getBoundingClientRect = () =>
    ({
      x,
      y,
      left: x,
      top: y,
      right: x + w,
      bottom: y + h,
      width: w,
      height: h,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

const channel = (el: HTMLElement, name: string) =>
  el.style.getPropertyValue(name);

describe("OverlayBox", () => {
  it("anchors the element at the origin and translates by its channels", () => {
    const el = overlayEl();
    const o = new OverlayBox(el);
    expect(el.style.top).toBe("0px");
    expect(el.style.left).toBe("0px");
    expect(channel(el, "translate")).toContain("var(--x, 0px)");
    o.dispose();
    el.remove();
  });

  it("reads geometry from the measured rect", () => {
    const el = overlayEl(200, 120, 100, 80);
    const o = new OverlayBox(el);
    expect({ x: o.x, y: o.y, w: o.w, h: o.h }).toEqual({
      x: 100,
      y: 80,
      w: 200,
      h: 120,
    });
    o.dispose();
    el.remove();
  });

  it("projects writes into the --x/--y/--w/--h channels", () => {
    const el = overlayEl();
    const o = new OverlayBox(el);
    o.x = 120;
    o.y = 140;
    o.w = 300;
    o.h = 200;
    expect(channel(el, "--x")).toBe("120px");
    expect(channel(el, "--y")).toBe("140px");
    expect(channel(el, "--w")).toBe("300px");
    expect(channel(el, "--h")).toBe("200px");
    o.dispose();
    el.remove();
  });

  it("unsets a size channel on AUTO so the element sizes to content", () => {
    const el = overlayEl();
    const o = new OverlayBox(el);
    o.w = 300;
    o.w = AUTO;
    expect(channel(el, "--w")).toBe("");
    o.dispose();
    el.remove();
  });

  it("projects displacement into --dx/--dy and folds it in on apply()", () => {
    const el = overlayEl();
    const o = new OverlayBox(el);
    o.x = 100;
    o.displacement.x = 25;
    expect(channel(el, "--dx")).toBe("25px");
    o.displacement.apply();
    expect(channel(el, "--x")).toBe("125px");
    expect(channel(el, "--dx")).toBe("");
    o.dispose();
    el.remove();
  });

  it("stops projecting after dispose", () => {
    const el = overlayEl();
    const o = new OverlayBox(el);
    o.x = 10;
    o.dispose();
    o.x = 20;
    expect(channel(el, "--x")).toBe("10px");
    el.remove();
  });
});
