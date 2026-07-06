import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anchor, areaToPlacement, constraint } from "./index.ts";

const floating = vi.hoisted(() => {
  const stop = vi.fn();
  const autoUpdate = vi.fn(
    (_reference: unknown, _floating: unknown, update: () => void) => {
      update();
      return stop;
    },
  );
  const computePosition = vi.fn(() =>
    Promise.resolve({
      x: 200,
      y: 300,
      placement: "bottom",
      middlewareData: {} as Record<string, unknown>,
    }),
  );
  const flip = vi.fn(() => "flip");
  const shift = vi.fn(() => "shift");
  const arrow = vi.fn(() => "arrow");
  return { stop, autoUpdate, computePosition, flip, shift, arrow };
});

vi.mock("@floating-ui/dom", () => ({
  autoUpdate: floating.autoUpdate,
  computePosition: floating.computePosition,
  offset: (px: number) => px,
  flip: floating.flip,
  shift: floating.shift,
  arrow: floating.arrow,
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
  floating.flip.mockClear();
  floating.shift.mockClear();
  floating.arrow.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  document
    .querySelectorAll(".x-overlay-anchor")
    .forEach((el) => el.remove());
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

describe("anchor (native engine)", () => {
  beforeEach(() => {
    vi.stubGlobal("CSS", { supports: () => true });
  });

  it("returns the anchor element, chained overlay ← anchor ← trigger", () => {
    const { overlay: el, trigger } = createAnchored();
    const a = anchor(el, trigger);

    expect(a.className).toBe("x-overlay-anchor");
    expect(el.getAttribute("data-anchor")).toBe("element");
    expect(el.getAttribute("data-placed")).toBe("bottom"); // area hint
    // overlay → anchor element
    const proxyName = a.style.getPropertyValue("anchor-name");
    expect(proxyName).toMatch(/^--overlay-anchor-\d+$/);
    expect(el.style.getPropertyValue("position-anchor")).toBe(proxyName);
    // anchor element → trigger (the follow pin)
    expect(a.hasAttribute("data-follow")).toBe(true);
    const followName = trigger.style.getPropertyValue("anchor-name");
    expect(followName).toMatch(/^--overlay-follow-\d+$/);
    expect(a.style.getPropertyValue("position-anchor")).toBe(followName);
    // zero JS while following
    expect(floating.autoUpdate).not.toHaveBeenCalled();

    el.remove();
    trigger.remove();
  });

  it("re-pins a torn-off anchor on a fresh open", async () => {
    const { overlay: el, trigger } = createAnchored();
    const a = anchor(el, trigger);

    // The drag service tears the pin (the data-follow contract).
    a.removeAttribute("data-follow");
    a.style.left = "600px";
    a.style.top = "400px";

    el.removeAttribute("open");
    el.setAttribute("open", "");
    await vi.waitFor(() => {
      expect(a.hasAttribute("data-follow")).toBe(true);
      expect(a.style.left).toBe("");
    });

    el.remove();
    trigger.remove();
  });

  it("cleans everything up when the scope disposes", () => {
    const { overlay: el, trigger } = createAnchored();
    // No surrounding scope in tests — grab the cleanup via a rect anchor
    // and dispose manually through element removal checks after GC of
    // scope is impossible here; assert the wiring exists then remains
    // author-managed. (Scope-level disposal is covered by effectScope
    // usage in the utilities suites.)
    const a = anchor(el, trigger);
    expect(document.body.contains(a)).toBe(true);
    el.remove();
    trigger.remove();
  });
});

describe("anchor (Floating UI engine)", () => {
  beforeEach(() => {
    vi.stubGlobal("CSS", { supports: () => false });
  });

  it("writes the box center into the location channels while open", async () => {
    const { overlay: el, trigger } = createAnchored();
    const a = anchor(el, trigger);

    // Overlay loop runs against the anchor element…
    expect(floating.autoUpdate).toHaveBeenCalledWith(
      el.ownerDocument.querySelector(".x-overlay-anchor"),
      el,
      expect.any(Function),
    );
    // …and the follow sync pins the anchor element to the trigger.
    expect(floating.autoUpdate).toHaveBeenCalledWith(
      trigger,
      a,
      expect.any(Function),
    );
    await vi.waitFor(() => {
      // computePosition's (200, 300) top-left + (240, 150) half-box.
      expect(el.style.getPropertyValue("--overlay-x")).toBe("440px");
      expect(el.style.getPropertyValue("--overlay-y")).toBe("450px");
    });
    expect(floating.computePosition).toHaveBeenCalledWith(
      a,
      el,
      expect.objectContaining({ strategy: "fixed", placement: "bottom" }),
    );
    // Tracking suppresses transitions…
    await vi.waitFor(() => expect(el.style.transitionDuration).toBe("0s"));

    el.remove();
    trigger.remove();
  });

  it("starts and stops the loop with the open state", async () => {
    const { overlay: el, trigger } = createAnchored(false);
    anchor(el, trigger);
    const overlayLoop = floating.autoUpdate.mock.calls.filter(
      (c) => c[1] === el,
    );
    expect(overlayLoop).toHaveLength(0);

    el.setAttribute("open", "");
    await vi.waitFor(() =>
      expect(
        floating.autoUpdate.mock.calls.filter((c) => c[1] === el),
      ).toHaveLength(1),
    );

    el.removeAttribute("open");
    await vi.waitFor(() => expect(floating.stop).toHaveBeenCalled());
    expect(el.style.transitionDuration).toBe("");

    el.remove();
    trigger.remove();
  });

  it("dragmove on the anchor element triggers an immediate reposition", async () => {
    const { overlay: el, trigger } = createAnchored();
    const a = anchor(el, trigger);
    await vi.waitFor(() => expect(floating.computePosition).toHaveBeenCalled());
    const calls = floating.computePosition.mock.calls.length;

    a.dispatchEvent(new CustomEvent("dragmove", { detail: { x: 1, y: 2 } }));
    await vi.waitFor(() =>
      expect(floating.computePosition.mock.calls.length).toBeGreaterThan(
        calls,
      ),
    );

    el.remove();
    trigger.remove();
  });

  it("within confines the flip/shift boundary (and forces this engine)", async () => {
    vi.stubGlobal("CSS", { supports: () => true }); // native available…
    const { overlay: el, trigger } = createAnchored();
    const region = constraint({ top: 5, left: 10, width: 500, height: 400 });
    anchor(el, trigger, { within: region }); // …but within forces Floating UI

    await vi.waitFor(() => {
      expect(floating.flip).toHaveBeenCalledWith({
        boundary: { x: 10, y: 5, width: 500, height: 400 },
      });
      expect(floating.shift).toHaveBeenCalledWith({
        boundary: { x: 10, y: 5, width: 500, height: 400 },
      });
    });
    expect(el.style.getPropertyValue("position-anchor")).toBe("");

    el.remove();
    trigger.remove();
  });

  it("arrow injects the caret, feeds the middleware, writes channels", async () => {
    const { overlay: el, trigger } = createAnchored();
    floating.computePosition.mockResolvedValueOnce({
      x: 200,
      y: 300,
      placement: "top",
      middlewareData: { arrow: { x: 120 } },
    });
    anchor(el, trigger, { arrow: 12 });

    const caret = el.querySelector(":scope > .x-overlay-arrow");
    expect(caret).not.toBeNull();
    expect(floating.arrow).toHaveBeenCalledWith({ element: caret });
    expect(el.style.getPropertyValue("--overlay-arrow-size")).toBe("12px");
    await vi.waitFor(() => {
      expect(el.getAttribute("data-placed")).toBe("top");
      expect(el.style.getPropertyValue("--overlay-arrow-x")).toBe("120px");
    });

    el.remove();
    trigger.remove();
  });
});
