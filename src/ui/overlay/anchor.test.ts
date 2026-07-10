import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Anchor, Constraint, Overlay } from "./index.ts";
import { areaToPlacement } from "./anchor.ts";

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
  // Layout size (used for the center conversion — transform-immune).
  Object.defineProperty(el, "offsetWidth", { value: 480 });
  Object.defineProperty(el, "offsetHeight", { value: 300 });
  document.body.appendChild(el);
  const trigger = document.createElement("button");
  document.body.appendChild(trigger);
  return { overlay: el, trigger };
}

/** The proxy element an Anchor creates (no element return anymore). */
const anchorEl = (): HTMLElement =>
  document.querySelector<HTMLElement>(".x-overlay-anchor")!;

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

describe("Anchor (native engine)", () => {
  beforeEach(() => {
    vi.stubGlobal("CSS", { supports: () => true });
  });

  it("creates the anchor element, chained overlay ← anchor ← trigger", () => {
    const { overlay: el, trigger } = createAnchored();
    const anchor = new Anchor(trigger);
    const o = new Overlay(el, { anchor });
    const a = anchorEl();

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
    // zero JS while following; the CSS glide transition stays live
    expect(floating.autoUpdate).not.toHaveBeenCalled();
    expect(a.style.transitionProperty).toBe("");

    o.dispose();
    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("a reactive target getter re-pins to the new element (nav glide)", async () => {
    const { overlay: el, trigger } = createAnchored();
    const second = document.createElement("button");
    document.body.appendChild(second);
    const { signal } = await import("@/signals/index.ts");
    const target = signal<Element>(trigger);

    const anchor = new Anchor(() => target());
    new Overlay(el, { anchor });
    const a = anchorEl();
    expect(trigger.style.getPropertyValue("anchor-name")).toMatch(
      /^--overlay-follow-\d+$/,
    );

    target(second);
    await vi.waitFor(() => {
      // Same position-anchor name migrates — the proxy glides via CSS.
      expect(trigger.style.getPropertyValue("anchor-name")).toBe("");
      expect(second.style.getPropertyValue("anchor-name")).toBe(
        a.style.getPropertyValue("position-anchor"),
      );
    });
    expect(a.hasAttribute("data-follow")).toBe(true);

    anchor.dispose();
    el.remove();
    trigger.remove();
    second.remove();
  });

  it("a reactive target forces the channel engine (flips morph, never jump)", async () => {
    // Native placement cannot INTERPOLATE a side flip — a signal-driven
    // re-pin gliding the proxy would flip position-area mid-flight (a
    // visible jump). Reactive targets therefore use the channel engine,
    // which resolves placement once at the destination and morphs.
    const { overlay: el, trigger } = createAnchored();
    const anchor = new Anchor(() => trigger);
    new Overlay(el, { anchor });

    expect(el.getAttribute("data-anchor")).toBeNull();
    expect(
      floating.autoUpdate.mock.calls.filter((c) => c[1] === el),
    ).toHaveLength(1); // the channel loop runs (overlay is open)

    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("re-pins a torn-off anchor on a fresh open", async () => {
    const { overlay: el, trigger } = createAnchored();
    const anchor = new Anchor(trigger);
    new Overlay(el, { anchor });
    const a = anchorEl();

    // An edit tears the pin (the data-follow contract).
    a.removeAttribute("data-follow");
    a.style.left = "600px";
    a.style.top = "400px";

    el.removeAttribute("open");
    el.setAttribute("open", "");
    await vi.waitFor(() => {
      expect(a.hasAttribute("data-follow")).toBe(true);
      expect(a.style.left).toBe("");
    });

    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("set() tears the pin and places the box (size kept when omitted)", () => {
    const { overlay: el, trigger } = createAnchored();
    const anchor = new Anchor(trigger);
    new Overlay(el, { anchor });
    const a = anchorEl();
    a.getBoundingClientRect = () =>
      ({ x: 100, y: 100, left: 100, top: 100, right: 120, bottom: 130,
         width: 20, height: 30, toJSON: () => ({}) }) as DOMRect;
    expect(a.hasAttribute("data-follow")).toBe(true);

    anchor.set({ x: 400, y: 500 });
    expect(a.hasAttribute("data-follow")).toBe(false);
    expect(a.style.getPropertyValue("position-anchor")).toBe("");
    expect(a.style.left).toBe("400px");
    expect(a.style.top).toBe("500px");
    // Frozen at the current size — no w/h in the write.
    expect(a.style.width).toBe("20px");
    expect(a.style.height).toBe("30px");

    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("releasing the binding leaves the overlay where it was", async () => {
    const { overlay: el, trigger } = createAnchored();
    const { effectScope } = await import("@/signals/index.ts");
    const stop = effectScope(() => {
      new Overlay(el, { anchor: new Anchor(trigger) });
    });

    stop();
    // Seeded from the rendered rect: center (340, 250) − origin (0, 0).
    expect(el.style.getPropertyValue("--overlay-x")).toBe("340px");
    expect(el.style.getPropertyValue("--overlay-y")).toBe("250px");
    expect(el.getAttribute("data-anchor")).toBeNull();
    expect(document.querySelector(".x-overlay-anchor")).toBeNull();

    el.remove();
    trigger.remove();
  });
});

describe("Anchor (Floating UI engine)", () => {
  beforeEach(() => {
    vi.stubGlobal("CSS", { supports: () => false });
  });

  it("writes the box center into the location channels while open", async () => {
    const { overlay: el, trigger } = createAnchored();
    const anchor = new Anchor(trigger);
    new Overlay(el, { anchor });
    const a = anchorEl();

    // Overlay loop runs against the anchor element…
    expect(floating.autoUpdate).toHaveBeenCalledWith(
      a,
      el,
      expect.any(Function),
    );
    // …and the follow sync pins the anchor element to the trigger.
    expect(floating.autoUpdate).toHaveBeenCalledWith(
      trigger,
      a,
      expect.any(Function),
    );
    // JS-driven proxy: the CSS glide transition must not ease its writes
    // (the overlay's channel morph provides the glide below the gate).
    expect(a.style.transitionProperty).toBe("none");
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
    // The initial positioning write is instant; geometry transitions
    // re-enable after it (Base UI's data-instant semantics).
    await vi.waitFor(() => expect(el.style.transitionProperty).toBe(""));

    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("starts and stops the loop with the open state", async () => {
    const { overlay: el, trigger } = createAnchored(false);
    const anchor = new Anchor(trigger);
    new Overlay(el, { anchor });
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
    expect(el.style.transitionProperty).toBe("");

    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("releasing the binding keeps the location channels", async () => {
    const { overlay: el, trigger } = createAnchored();
    const { effectScope } = await import("@/signals/index.ts");
    const stop = effectScope(() => {
      new Overlay(el, { anchor: new Anchor(trigger) });
    });
    await vi.waitFor(() =>
      expect(el.style.getPropertyValue("--overlay-x")).toBe("440px"),
    );

    stop();
    expect(el.style.getPropertyValue("--overlay-x")).toBe("440px");
    expect(el.getAttribute("data-placed")).toBeNull();
    expect(document.querySelector(".x-overlay-anchor")).toBeNull();

    el.remove();
    trigger.remove();
  });

  it("re-anchoring an already-placed overlay morphs in (no instant write)", async () => {
    const { overlay: el, trigger } = createAnchored();
    el.style.setProperty("--overlay-x", "300px");
    el.style.setProperty("--overlay-y", "300px");

    const anchor = new Anchor(trigger);
    new Overlay(el, { anchor });
    // Open + already placed → the first write animates (recipe switch).
    expect(el.style.transitionProperty).toBe("");
    await vi.waitFor(() =>
      expect(el.style.getPropertyValue("--overlay-x")).toBe("440px"),
    );
    expect(el.style.transitionProperty).toBe("");

    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("an edit repositions instantly (geometry suppressed until release)", async () => {
    const { overlay: el, trigger } = createAnchored();
    const anchor = new Anchor(trigger);
    new Overlay(el, { anchor });
    const a = anchorEl();
    a.getBoundingClientRect = () =>
      ({ x: 100, y: 100, left: 100, top: 100, right: 120, bottom: 120,
         width: 20, height: 20, toJSON: () => ({}) }) as DOMRect;
    await vi.waitFor(() => expect(floating.computePosition).toHaveBeenCalled());
    const calls = floating.computePosition.mock.calls.length;

    anchor.begin();
    anchor.set({ x: 101, y: 102 });
    // Tracking the finger: geometry transitions off, enter/exit kept.
    expect(el.style.transitionProperty).toBe("opacity, scale, display");
    await vi.waitFor(() =>
      expect(floating.computePosition.mock.calls.length).toBeGreaterThan(
        calls,
      ),
    );
    anchor.release();
    expect(el.style.transitionProperty).toBe("");

    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("within bounds the flip/shift (and forces this engine)", async () => {
    vi.stubGlobal("CSS", { supports: () => true }); // native available…
    const { overlay: el, trigger } = createAnchored();
    const anchor = new Anchor(trigger);
    // …but within forces the boundary-aware engine.
    new Overlay(el, {
      anchor,
      within: new Constraint({ x: 10, y: 5, w: 500, h: 400 }),
    });

    await vi.waitFor(() => {
      expect(floating.flip).toHaveBeenCalledWith({
        boundary: { x: 10, y: 5, width: 500, height: 400 },
      });
      expect(floating.shift).toHaveBeenCalledWith({
        boundary: { x: 10, y: 5, width: 500, height: 400 },
      });
    });
    expect(el.style.getPropertyValue("position-anchor")).toBe("");

    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("data-draggable drags the anchor through its edit (tear contract)", async () => {
    const { overlay: el, trigger } = createAnchored();
    el.setAttribute("data-draggable", "");
    const anchor = new Anchor(trigger);
    new Overlay(el, { anchor });
    const a = anchorEl();
    a.getBoundingClientRect = () =>
      ({ x: 100, y: 100, left: 100, top: 100, right: 120, bottom: 120,
         width: 20, height: 20, toJSON: () => ({}) }) as DOMRect;
    await vi.waitFor(() => expect(a.hasAttribute("data-follow")).toBe(true));

    // Dragging the OVERLAY moves the anchor element (the handle contract).
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: 10, clientY: 10, button: 0, bubbles: true,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: 60, clientY: 40, bubbles: true,
      }),
    );
    expect(a.hasAttribute("data-follow")).toBe(false);
    expect(a.style.left).toBe("150px");
    expect(a.style.top).toBe("130px");
    el.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: 60, clientY: 40, bubbles: true,
      }),
    );

    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("an anchored drag from scrolled content does not engage", async () => {
    const { overlay: el, trigger } = createAnchored();
    el.setAttribute("data-draggable", "");
    const scroller = document.createElement("div");
    Object.defineProperty(scroller, "scrollTop", { value: 40 });
    el.appendChild(scroller);
    const anchor = new Anchor(trigger);
    new Overlay(el, { anchor });
    const a = anchorEl();
    await vi.waitFor(() => expect(a.hasAttribute("data-follow")).toBe(true));

    // A pointer starting inside scrolled content keeps its scroll-back
    // gesture — the drag must not tear the pin.
    scroller.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: 10, clientY: 10, button: 0, bubbles: true,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: 60, clientY: 40, bubbles: true,
      }),
    );
    expect(a.hasAttribute("data-follow")).toBe(true);

    anchor.dispose();
    el.remove();
    trigger.remove();
  });

  it("a dot target pins one-shot at a zero-size box", () => {
    const { overlay: el, trigger } = createAnchored();
    trigger.remove();
    const anchor = new Anchor({ x: 320, y: 240 });
    new Overlay(el, { anchor });
    const a = anchorEl();

    expect(a.style.left).toBe("320px");
    expect(a.style.top).toBe("240px");
    expect(a.style.width).toBe("0px");
    expect(a.style.height).toBe("0px");
    expect(a.hasAttribute("data-follow")).toBe(false); // one-shot

    anchor.dispose();
    el.remove();
  });

  it("a reactive box re-places the anchor until torn", async () => {
    const { overlay: el, trigger } = createAnchored();
    trigger.remove();
    const { signal } = await import("@/signals/index.ts");
    const mx = signal(100);
    const anchor = new Anchor({ x: () => mx(), y: 50 });
    new Overlay(el, { anchor });
    const a = anchorEl();

    expect(a.hasAttribute("data-follow")).toBe(true); // reactive pin holds
    expect(a.style.left).toBe("100px");
    mx(260);
    await vi.waitFor(() => expect(a.style.left).toBe("260px"));

    // Tearing (an edit) stops the effect.
    anchor.set({ x: 10, y: 10 });
    mx(999);
    await new Promise((r) => setTimeout(r, 10));
    expect(a.style.left).toBe("10px");

    anchor.dispose();
    el.remove();
  });

  it("composes with constrain(): set lands clamped", () => {
    const { overlay: el, trigger } = createAnchored();
    const anchor = new Anchor(trigger);
    new Overlay(el, { anchor });
    const a = anchorEl();
    a.getBoundingClientRect = () =>
      ({ x: 0, y: 0, left: 0, top: 0, right: 20, bottom: 20,
         width: 20, height: 20, toJSON: () => ({}) }) as DOMRect;

    const c = new Constraint({ x: 0, y: 0, w: 300, h: 300 });
    anchor.set(c.constrain({ x: 900, y: 900, w: 20, h: 20 }));
    expect(a.style.left).toBe("280px");
    expect(a.style.top).toBe("280px");

    anchor.dispose();
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
    const anchor = new Anchor(trigger, { arrow: 12 });
    new Overlay(el, { anchor });

    const caret = el.querySelector(":scope > .x-overlay-arrow");
    expect(caret).not.toBeNull();
    expect(floating.arrow).toHaveBeenCalledWith({ element: caret });
    expect(el.style.getPropertyValue("--overlay-arrow-size")).toBe("12px");
    await vi.waitFor(() => {
      expect(el.getAttribute("data-placed")).toBe("top");
      expect(el.style.getPropertyValue("--overlay-arrow-x")).toBe("120px");
    });

    anchor.dispose();
    el.remove();
    trigger.remove();
  });
});
