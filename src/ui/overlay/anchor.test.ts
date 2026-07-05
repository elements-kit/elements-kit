import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anchorOverlay, areaToPlacement, overlay } from "./index.ts";

const floating = vi.hoisted(() => {
  const stop = vi.fn();
  const autoUpdate = vi.fn(
    (_anchor: unknown, _overlay: unknown, update: () => void) => {
      update();
      return stop;
    },
  );
  const computePosition = vi.fn(() => Promise.resolve({ x: 200, y: 300 }));
  return { stop, autoUpdate, computePosition };
});

vi.mock("@floating-ui/dom", () => ({
  autoUpdate: floating.autoUpdate,
  computePosition: floating.computePosition,
  offset: (px: number) => px,
  flip: () => "flip",
  shift: () => "shift",
}));

function createAnchored(open = true): {
  overlay: HTMLDialogElement;
  trigger: HTMLButtonElement;
} {
  const el = document.createElement("dialog");
  el.className = "unset x-overlay";
  if (open) el.setAttribute("open", "");
  // Constraint in plain px (the vw/vh defaults resolve to 0 in happy-dom)
  // and a bound rect — 480×300, so the center offset is (240, 150).
  el.style.setProperty("--overlay-constraint-top", "0px");
  el.style.setProperty("--overlay-constraint-left", "0px");
  el.style.setProperty("--overlay-constraint-width", "1024px");
  el.style.setProperty("--overlay-constraint-height", "768px");
  el.getBoundingClientRect = () =>
    ({ x: 100, y: 100, left: 100, top: 100, right: 580, bottom: 400,
       width: 480, height: 300, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(el);
  const trigger = document.createElement("button");
  document.body.appendChild(trigger);
  return { overlay: el, trigger };
}

beforeEach(() => {
  floating.stop.mockClear();
  floating.autoUpdate.mockClear();
  floating.computePosition.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("areaToPlacement", () => {
  it("maps the main sides (physical inline resolved by dir)", () => {
    expect(areaToPlacement("block-end")).toBe("bottom");
    expect(areaToPlacement("block-start")).toBe("top");
    expect(areaToPlacement("inline-end")).toBe("right");
    expect(areaToPlacement("inline-start")).toBe("left");
    expect(areaToPlacement("inline-end", true)).toBe("left");
    expect(areaToPlacement("inline-start", true)).toBe("right");
  });

  it("maps span tokens to the opposite alignment, order-insensitive", () => {
    // Spanning toward an edge leaves the box flush with the opposite one.
    expect(areaToPlacement("block-end span-inline-end")).toBe("bottom-start");
    expect(areaToPlacement("block-end span-inline-start")).toBe("bottom-end");
    expect(areaToPlacement("span-block-start inline-end")).toBe("right-end");
    expect(areaToPlacement("span-block-end inline-start")).toBe("left-start");
  });

  it("falls back to bottom (the block-end default)", () => {
    expect(areaToPlacement("")).toBe("bottom");
    expect(areaToPlacement("nonsense")).toBe("bottom");
  });
});

describe("anchorOverlay (fallback tier)", () => {
  beforeEach(() => {
    vi.stubGlobal("CSS", { supports: () => false });
  });

  it("writes the box center into the location channels while open", async () => {
    const { overlay: el, trigger } = createAnchored();
    const a = anchorOverlay(el, trigger);

    expect(el.getAttribute("data-anchor")).toBe("element");
    expect(floating.autoUpdate).toHaveBeenCalledWith(
      trigger,
      el,
      expect.any(Function),
    );
    await vi.waitFor(() => {
      // computePosition's (200, 300) top-left + (240, 150) half-box.
      expect(el.style.getPropertyValue("--overlay-x")).toBe("440px");
      expect(el.style.getPropertyValue("--overlay-y")).toBe("450px");
    });
    expect(floating.computePosition).toHaveBeenCalledWith(
      trigger,
      el,
      expect.objectContaining({ strategy: "fixed", placement: "bottom" }),
    );
    // Transitions are suspended so the box tracks instead of chasing.
    expect(el.style.transitionDuration).toBe("0s");

    a.dispose();
    expect(floating.stop).toHaveBeenCalled();
    expect(el.style.getPropertyValue("--overlay-x")).toBe("");
    expect(el.style.getPropertyValue("--overlay-y")).toBe("");
    expect(el.style.transitionDuration).toBe("");
    el.remove();
    trigger.remove();
  });

  it("starts and stops the loop with the open state", async () => {
    const { overlay: el, trigger } = createAnchored(false);
    const a = anchorOverlay(el, trigger);
    expect(floating.autoUpdate).not.toHaveBeenCalled();

    el.setAttribute("open", "");
    await vi.waitFor(() => expect(floating.autoUpdate).toHaveBeenCalled());

    el.removeAttribute("open");
    await vi.waitFor(() => expect(floating.stop).toHaveBeenCalled());
    expect(el.style.transitionDuration).toBe("");

    a.dispose();
    el.remove();
    trigger.remove();
  });

  it("supports Symbol.dispose", () => {
    const { overlay: el, trigger } = createAnchored(false);
    const a = anchorOverlay(el, trigger);
    expect(typeof a[Symbol.dispose]).toBe("function");
    a[Symbol.dispose]();
    el.remove();
    trigger.remove();
  });
});

describe("anchorOverlay (native tier)", () => {
  beforeEach(() => {
    vi.stubGlobal("CSS", { supports: () => true });
  });

  it("wires an anchor-name pair and attaches no listeners", () => {
    const { overlay: el, trigger } = createAnchored();
    const a = anchorOverlay(el, trigger);

    expect(el.getAttribute("data-anchor")).toBe("element");
    expect(floating.autoUpdate).not.toHaveBeenCalled();
    const name = trigger.style.getPropertyValue("anchor-name");
    expect(name).toMatch(/^--overlay-anchor-\d+$/);
    expect(el.style.getPropertyValue("position-anchor")).toBe(name);

    a.dispose();
    expect(trigger.style.getPropertyValue("anchor-name")).toBe("");
    expect(el.style.getPropertyValue("position-anchor")).toBe("");
    el.remove();
    trigger.remove();
  });
});

describe("overlay facade with anchor", () => {
  it("anchor wins over constrain and tears down on dispose", async () => {
    vi.stubGlobal("CSS", { supports: () => false });
    const { overlay: el, trigger } = createAnchored();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const o = overlay(el, { anchor: trigger, constrain: container });
    expect(el.getAttribute("data-anchor")).toBe("element");
    // constrain is ignored when anchor is set — the inline px set by the
    // fixture stays, but no sync effect rewrites it from the container.
    await vi.waitFor(() => expect(floating.autoUpdate).toHaveBeenCalled());

    o.dispose();
    expect(floating.stop).toHaveBeenCalled();
    container.remove();
    el.remove();
    trigger.remove();
  });
});
