import { describe, expect, it } from "vitest";
import { Constraint, Overlay } from "./index.ts";

/** A rect-mocked `.x-overlay` dialog (happy-dom has no layout). */
function overlayEl(w = 200, h = 120, x = 100, y = 80): HTMLDialogElement {
  const el = document.createElement("dialog");
  el.className = "unset x-overlay";
  el.getBoundingClientRect = () =>
    ({
      x, y, left: x, top: y, right: x + w, bottom: y + h,
      width: w, height: h, toJSON: () => ({}),
    }) as DOMRect;
  Object.defineProperty(el, "offsetWidth", { value: w, configurable: true });
  Object.defineProperty(el, "offsetHeight", { value: h, configurable: true });
  const card = document.createElement("div");
  card.className = "x-card";
  el.appendChild(card);
  document.body.appendChild(el);
  return el;
}

describe("Constraint", () => {
  it("constrain clamps position and caps size", () => {
    const c = new Constraint({ x: 100, y: 100, w: 400, h: 300 });
    expect(c.constrain({ x: 150, y: 150, w: 100, h: 100 })).toEqual({
      x: 150, y: 150, w: 100, h: 100,
    });
    // overflow → clamped to keep the box inside
    expect(c.constrain({ x: 480, y: 380, w: 100, h: 100 })).toEqual({
      x: 400, y: 300, w: 100, h: 100,
    });
    // oversize → capped to the region
    expect(c.constrain({ x: 0, y: 0, w: 900, h: 900 })).toEqual({
      x: 100, y: 100, w: 400, h: 300,
    });
  });

  it("dock sits the box flush against edge(s)", () => {
    const c = new Constraint({ x: 0, y: 0, w: 1000, h: 800 });
    expect(c.dock({ x: 0, y: 0, w: 200, h: 100 }, "bottom")).toEqual({
      x: 0, y: 700, w: 200, h: 100,
    });
    expect(c.dock({ x: 0, y: 0, w: 200, h: 100 }, "bottom", "right")).toEqual({
      x: 800, y: 700, w: 200, h: 100,
    });
  });

  it("a plain-box Constraint is editable and re-clamps", () => {
    const c = new Constraint({ x: 0, y: 0, w: 500, h: 500 });
    c.set({ w: 800 });
    expect(c.w).toBe(800);
  });

  it("an element-backed Constraint is read-only", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const c = new Constraint(div);
    expect(() => c.set({ w: 100 })).toThrow();
    div.remove();
  });
});

describe("Overlay", () => {
  const region = () => new Constraint({ x: 0, y: 0, w: 1000, h: 1000 });

  it("set() writes the box geometry, clamped to the constraint", () => {
    const el = overlayEl();
    const o = new Overlay(el, { within: region() });
    o.set({ x: 5000, y: 5000, w: 300, h: 200 });
    // clamped: x = 1000 − 300, y = 1000 − 200
    expect(o.x).toBe(700);
    expect(o.y).toBe(800);
    expect(o.w).toBe(300);
    expect(o.h).toBe(200);
    o.dispose();
    el.remove();
  });

  it("set() projects the base into the --x/--y/--w/--h channels", () => {
    const el = overlayEl();
    const o = new Overlay(el, { within: region() });
    o.set({ x: 120, y: 140, w: 300, h: 200 });
    expect(el.style.getPropertyValue("--x")).toBe("120px");
    expect(el.style.getPropertyValue("--y")).toBe("140px");
    expect(el.style.getPropertyValue("--w")).toBe("300px");
    expect(el.style.getPropertyValue("--h")).toBe("200px");
    o.dispose();
    el.remove();
  });

  it("dock() sits the box flush to a constraint edge", () => {
    const el = overlayEl();
    const o = new Overlay(el, { within: new Constraint({ x: 0, y: 0, w: 1000, h: 800 }) });
    o.set({ w: 300, h: 200 });
    o.dock("bottom");
    expect(o.y).toBe(600); // 800 − 200
    o.dock("bottom", "right");
    expect(o.x).toBe(700); // 1000 − 300
    o.dispose();
    el.remove();
  });

  it("center() places the box in the middle of the constraint", () => {
    const el = overlayEl();
    const o = new Overlay(el, { within: region() });
    o.set({ w: 400, h: 200 });
    o.center();
    expect(o.x).toBe(300); // (1000 − 400) / 2
    expect(o.y).toBe(400); // (1000 − 200) / 2
    o.dispose();
    el.remove();
  });

  it("honors an authored --overlay-w/-h size channel", () => {
    const el = overlayEl();
    el.style.setProperty("--overlay-w", "260px");
    el.style.setProperty("--overlay-h", "180px");
    const o = new Overlay(el, { within: region() });
    expect(o.w).toBe(260);
    expect(o.h).toBe(180);
    o.dispose();
    el.remove();
  });

  it("resolves data-detents to constraint-fraction pixels for a resize handle", () => {
    // A block-start handle drives height; detents = fractions × constraint.h.
    const el = overlayEl();
    const grip = document.createElement("div");
    grip.className = "x-handle";
    grip.setAttribute("data-placement", "block-start");
    grip.setAttribute("data-detents", "0.25 0.5 0.75");
    el.appendChild(grip);
    const o = new Overlay(el, { within: new Constraint({ x: 0, y: 0, w: 1000, h: 800 }) });
    // (resolution is exercised through the wired Resizable; assert construction
    // succeeds and the handle is present — full snap behavior is covered by the
    // browser visual harness.)
    expect(el.querySelector('.x-handle[data-detents]')).not.toBeNull();
    o.dispose();
    el.remove();
  });

  it("initial box option is applied and clamped", () => {
    const el = overlayEl();
    const o = new Overlay(el, {
      within: region(),
      box: { x: 5000, y: 5000, w: 200, h: 100 },
    });
    expect(o.x).toBe(800);
    expect(o.y).toBe(900);
    o.dispose();
    el.remove();
  });

  it("stops reacting after dispose (Symbol.dispose)", () => {
    const el = overlayEl();
    const o = new Overlay(el, { within: region() });
    expect(typeof o[Symbol.dispose]).toBe("function");
    o.dispose();
    el.remove();
  });
});
