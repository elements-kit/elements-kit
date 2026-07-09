import { describe, it, expect, vi } from "vitest";
import { Constraint, Overlay } from "./index.ts";
import {
  closestDetent,
  freeResize,
  type ResizeContext,
} from "./gesture-model.ts";

function createOverlay(attrs?: {
  resize?: string;
  draggable?: boolean;
}): HTMLDialogElement {
  const el = document.createElement("dialog");
  el.className = "unset x-overlay";
  if (attrs?.resize !== undefined)
    el.setAttribute("data-resize", attrs.resize);
  if (attrs?.draggable) el.setAttribute("data-draggable", "");
  const card = document.createElement("div");
  card.className = "x-card";
  card.setAttribute("data-variant", "elevated");
  el.appendChild(card);
  document.body.appendChild(el);
  return el;
}

function drag(el: HTMLElement, fromY: number, toY: number) {
  el.dispatchEvent(
    new PointerEvent("pointerdown", { clientY: fromY, bubbles: true }),
  );
  el.dispatchEvent(
    new PointerEvent("pointermove", { clientY: toY, bubbles: true }),
  );
}

function dragX(el: HTMLElement, fromX: number, toX: number) {
  el.dispatchEvent(
    new PointerEvent("pointerdown", { clientX: fromX, bubbles: true }),
  );
  el.dispatchEvent(
    new PointerEvent("pointermove", { clientX: toX, bubbles: true }),
  );
}

function drag2D(
  el: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  el.dispatchEvent(
    new PointerEvent("pointerdown", {
      clientX: from.x,
      clientY: from.y,
      bubbles: true,
    }),
  );
  el.dispatchEvent(
    new PointerEvent("pointermove", {
      clientX: to.x,
      clientY: to.y,
      bubbles: true,
    }),
  );
}

function pointerUp(el: HTMLElement, at: { x?: number; y?: number }) {
  el.dispatchEvent(
    new PointerEvent("pointerup", {
      clientX: at.x ?? 0,
      clientY: at.y ?? 0,
      bubbles: true,
    }),
  );
}

/** Binds the overlay's rendered rect — happy-dom has no layout. The
 * default window rect is 480×300 at (100, 100) → center (340, 250),
 * corner at (580, 400). */
function bindRect(el: HTMLElement, left = 100, top = 100) {
  el.getBoundingClientRect = () =>
    ({
      x: left,
      y: top,
      left,
      top,
      right: left + 480,
      bottom: top + 300,
      width: 480,
      height: 300,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** Window-overlay setup: bound rect + a 1024×768 constraint in plain px
 * (the vw/vh defaults would resolve to 0 in happy-dom). */
function mockWindowRect(el: HTMLElement) {
  el.style.setProperty("--overlay-constraint-top", "0px");
  el.style.setProperty("--overlay-constraint-left", "0px");
  el.style.setProperty("--overlay-constraint-width", "1024px");
  el.style.setProperty("--overlay-constraint-height", "768px");
  bindRect(el);
}

describe("x-overlay markup contract", () => {
  it("is a native <dialog> wrapping a card", () => {
    const el = createOverlay({ resize: "block-start" });
    expect(el.tagName).toBe("DIALOG");
    expect(el.querySelector(":scope > .x-card")).not.toBeNull();
    el.remove();
  });

  it("opens modally and closes natively", () => {
    const el = createOverlay({ resize: "block-start" });
    const onClose = vi.fn();
    el.addEventListener("close", onClose);

    el.showModal();
    expect(el.open).toBe(true);
    el.close();
    expect(el.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    el.remove();
  });

  it("round-trips the gesture attributes", () => {
    const el = createOverlay({
      resize: "end-end",
      draggable: true,
    });
    expect(el.getAttribute("data-resize")).toBe("end-end");
    expect(el.hasAttribute("data-draggable")).toBe(true);
    el.remove();
  });

  it("supports the popover modality attribute", () => {
    // happy-dom has no Popover API — attribute-level contract only.
    const el = createOverlay({ resize: "block-start" });
    el.setAttribute("popover", "manual");
    expect(el.getAttribute("popover")).toBe("manual");
    el.remove();
  });
});

describe("closestDetent", () => {
  const detents = [200, 480, 760];

  it("picks the nearest detent", () => {
    expect(closestDetent(210, detents)).toBe(0);
    expect(closestDetent(400, detents)).toBe(1);
    expect(closestDetent(900, detents)).toBe(2);
  });

  it("biases by release velocity", () => {
    // Released near "medium" but flicking shut fast → projects to "small".
    expect(closestDetent(420, detents, 1.2)).toBe(0);
    // Flicking open → projects to "large".
    expect(closestDetent(540, detents, -1.2)).toBe(2);
  });

  it("dismisses below half the smallest detent", () => {
    expect(closestDetent(80, detents, 0, true)).toBe(-1);
    expect(closestDetent(80, detents, 0, false)).toBe(0);
  });

  it("dismisses on a fast shrinking flick below the smallest detent", () => {
    expect(closestDetent(180, detents, 0.8, true, 0.5)).toBe(-1);
    expect(closestDetent(180, detents, 0.2, true, 0.5)).toBe(0);
  });
});

describe("resize strategies", () => {
  // A resolve that treats numbers as fractions of a 1000px axis and
  // strings as px (parseFloat), matching the gesture's real resolver.
  const ctx = (over: Partial<ResizeContext>): ResizeContext => ({
    size: 0,
    startSize: 0,
    velocity: 0,
    axis: "height",
    min: 0,
    max: 1000,
    dismissible: true,
    velocityThreshold: 0.5,
    resolve: (v) => (typeof v === "number" ? v * 1000 : parseFloat(v)),
    ...over,
  });

  it("freeResize clamps to the room and dismisses past the minimum", () => {
    const s = freeResize({ min: 200 });
    expect(s.bounds?.(ctx({}))).toEqual([200, 1000]);
    expect(s.rest(ctx({ size: 600 }))).toBe(600);
    expect(s.rest(ctx({ size: 1500 }))).toBe(1000);
    expect(s.rest(ctx({ size: 80 }))).toBeNull();
    expect(s.rest(ctx({ size: 80, dismissible: false }))).toBe(200);
  });
});

describe("Overlay", () => {
  it("set() writes the size channels and fires resizechange", () => {
    const el = createOverlay({ resize: "block-start" });
    const gestures = new Overlay(el);
    const onChange = vi.fn();
    el.addEventListener("resizechange", onChange);

    gestures.set({ h: 400 }); // block → height channel
    expect(el.style.getPropertyValue("--overlay-h")).toBe("400px");
    expect(el.style.getPropertyValue("--overlay-w")).toBe("");
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0].detail).toEqual({ height: "400px" });

    gestures.dispose();
    el.remove();
  });

  it("set() writes the width channel too", () => {
    const el = createOverlay({ resize: "inline-start" });
    const gestures = new Overlay(el);
    gestures.set({ w: 320 });
    expect(el.style.getPropertyValue("--overlay-w")).toBe("320px");
    expect(el.style.getPropertyValue("--overlay-h")).toBe("");
    gestures.dispose();
    el.remove();
  });

  it("engages by data-resize: height on block edges, width on inline", () => {
    // No gesture attributes, or a corner grip away from its zone
    // (rect-bound at zero) — no whole-surface engagement.
    for (const attrs of [
      undefined,
      { resize: "end-end" },
      { resize: "start-start" },
    ]) {
      const el = createOverlay(attrs);
      const gestures = new Overlay(el);
      drag(el, 100, 300);
      expect(el.style.height, attrs?.resize).toBe("");
      expect(el.style.transition, attrs?.resize).toBe("");
      gestures.dispose();
      el.remove();
    }
    for (const resize of ["block-start", "block-end"]) {
      const el = createOverlay({ resize });
      const gestures = new Overlay(el);
      drag(el, 100, 300);
      expect(el.style.height, resize).not.toBe("");
      expect(el.style.width, resize).toBe("");
      gestures.dispose();
      el.remove();
    }
    for (const resize of ["inline-start", "inline-end"]) {
      const el = createOverlay({ resize });
      const gestures = new Overlay(el);
      dragX(el, 100, 300);
      expect(el.style.width, resize).not.toBe("");
      expect(el.style.height, resize).toBe("");
      gestures.dispose();
      el.remove();
    }
  });

  it("does not engage from interactive elements (their click survives)", () => {
    const el = createOverlay({ resize: "block-start" });
    const card = el.querySelector(".x-card")!;
    const button = document.createElement("button");
    card.appendChild(button);
    const label = document.createElement("label");
    label.className = "x-toggle";
    label.appendChild(document.createElement("input"));
    card.appendChild(label);
    const gestures = new Overlay(el);

    for (const el of [button, label]) {
      el.dispatchEvent(
        new PointerEvent("pointerdown", { clientY: 100, bubbles: true }),
      );
      el.dispatchEvent(
        new PointerEvent("pointermove", { clientY: 300, bubbles: true }),
      );
      expect(el.style.height).toBe("");
      expect(el.style.userSelect).toBe("");
    }

    gestures.dispose();
    el.remove();
  });

  it("does not run channel gestures when an anchor is bound", () => {
    const el = createOverlay({ resize: "block-start" });
    // Structural stand-in — the option only needs the edit surface.
    const anchor = {
      bind: () => () => {},
      begin: () => {},
      set: () => {},
      release: () => null,
      cancel: () => {},
      x: () => 0,
      y: () => 0,
    };
    const gestures = new Overlay(el, {
      anchor: anchor as unknown as import("./anchor.ts").Anchor,
    });
    drag(el, 100, 300);
    expect(el.style.height).toBe("");
    gestures.dispose();
    el.remove();
  });

  it("grows toward the handle's pointer direction", () => {
    // Needs real room (a 1024×768 constraint with a 480×300 rect at 100,100):
    // the size caps at the room from the anchored edge, so a zero rect would
    // leave no room to grow. Assert direction (the driven height grows).
    // A bottom handle (block-end — top sheet) grows when dragged down.
    const down = createOverlay({ resize: "block-end" });
    mockWindowRect(down);
    const downGestures = new Overlay(down);
    drag(down, 100, 300);
    expect(parseFloat(down.style.height)).toBeGreaterThan(0);
    downGestures.dispose();
    down.remove();

    // A top handle (block-start — bottom sheet) grows when dragged up.
    const up = createOverlay({ resize: "block-start" });
    mockWindowRect(up);
    const upGestures = new Overlay(up);
    drag(up, 300, 100);
    expect(parseFloat(up.style.height)).toBeGreaterThan(0);
    upGestures.dispose();
    up.remove();
  });

  it("slides past the smallest detent via --overlay-dy, never translate", () => {
    const el = createOverlay({ resize: "block-start" });
    const gestures = new Overlay(el);
    // Dragging down shrinks a bottom sheet below its smallest detent
    // (0px in happy-dom) — the slide-away channel engages.
    drag(el, 100, 400);
    expect(el.style.getPropertyValue("--overlay-dy")).not.toBe("");
    expect(el.style.translate ?? "").toBe("");

    el.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    expect(el.style.height).toBe("");
    expect(el.style.getPropertyValue("--overlay-dy")).toBe("");
    expect(el.style.transition).toBe("");
    gestures.dispose();
    el.remove();
  });

  it("drag-dismiss closes a dialog and hides a popover otherwise", () => {
    const dialog = createOverlay({ resize: "block-start" });
    dialog.showModal();
    const dialogGestures = new Overlay(dialog);
    drag(dialog, 100, 900);
    dialog.dispatchEvent(
      new PointerEvent("pointerup", { clientY: 900, bubbles: true }),
    );
    expect(dialog.open).toBe(false);
    dialogGestures.dispose();
    dialog.remove();

    const popover = document.createElement("div");
    popover.className = "unset x-overlay";
    popover.setAttribute("data-resize", "block-start");
    document.body.appendChild(popover);
    const hidePopover = vi.fn();
    (popover as unknown as { hidePopover: () => void }).hidePopover =
      hidePopover;
    const popGestures = new Overlay(popover);
    drag(popover, 100, 900);
    popover.dispatchEvent(
      new PointerEvent("pointerup", { clientY: 900, bubbles: true }),
    );
    expect(hidePopover).toHaveBeenCalledOnce();
    popGestures.dispose();
    popover.remove();
  });

  it("stops reacting after dispose", () => {
    const el = createOverlay({ resize: "block-start" });
    const gestures = new Overlay(el);
    gestures.dispose();

    drag(el, 100, 400);
    expect(el.style.height).toBe("");
    el.remove();
  });

  it("supports Symbol.dispose", () => {
    const el = createOverlay({ resize: "block-start" });
    const gestures = new Overlay(el);
    expect(typeof gestures[Symbol.dispose]).toBe("function");
    gestures[Symbol.dispose]();
    el.remove();
  });

  it("suppresses text selection while dragging, restores at rest", () => {
    const el = createOverlay({ resize: "block-start" });
    const gestures = new Overlay(el);
    drag(el, 100, 300);
    expect(el.style.userSelect).toBe("none");
    pointerUp(el, { y: 300 });
    expect(el.style.userSelect).toBe("");
    gestures.dispose();
    el.remove();
  });
});

describe("drawer gestures (single inline handle)", () => {
  it("grows away from its handle, direction-aware", () => {
    // Needs real room (the size caps at the room from the anchored edge).
    // LTR inline-end handle: dragging right grows.
    const startDocked = createOverlay({ resize: "inline-end" });
    mockWindowRect(startDocked);
    const startGestures = new Overlay(startDocked);
    dragX(startDocked, 100, 300);
    expect(parseFloat(startDocked.style.width)).toBeGreaterThan(0);
    startGestures.dispose();
    startDocked.remove();

    // LTR inline-start handle: dragging left grows.
    const endDocked = createOverlay({ resize: "inline-start" });
    mockWindowRect(endDocked);
    const endGestures = new Overlay(endDocked);
    dragX(endDocked, 300, 100);
    expect(parseFloat(endDocked.style.width)).toBeGreaterThan(0);
    endGestures.dispose();
    endDocked.remove();

    // RTL flips the physical sides: an inline-start handle sits at the
    // physical right — dragging right grows.
    const rtl = createOverlay({ resize: "inline-start" });
    rtl.style.direction = "rtl";
    mockWindowRect(rtl);
    const rtlGestures = new Overlay(rtl);
    dragX(rtl, 100, 300);
    expect(parseFloat(rtl.style.width)).toBeGreaterThan(0);
    rtlGestures.dispose();
    rtl.remove();
  });

  it("slides past the smallest detent via --overlay-dx, never translate", () => {
    // Shrinking an end-docked drawer (inline-start handle) below the
    // smallest detent (0px in happy-dom) — the slide-away channel engages.
    const el = createOverlay({ resize: "inline-start" });
    const gestures = new Overlay(el);
    dragX(el, 300, 400);
    expect(el.style.getPropertyValue("--overlay-dx")).not.toBe("");
    expect(el.style.translate ?? "").toBe("");
    gestures.dispose();
    el.remove();
  });

  it("dismisses when shrunk past the minimum", () => {
    const dialog = createOverlay({ resize: "inline-start" });
    dialog.showModal();
    const gestures = new Overlay(dialog);
    dragX(dialog, 100, 900); // far toward the docked edge → shrink → dismiss
    pointerUp(dialog, { x: 900 });
    expect(dialog.open).toBe(false);
    gestures.dispose();
    dialog.remove();
  });

  // Inline counterpart of the block-sheet anchoring: a floating drawer
  // pins its handle-less edge by shifting --overlay-x; a docked one
  // leaves the location to the CSS clamp.
  it("anchors the opposite edge when floating, not when docked", () => {
    const setRect = (o: HTMLElement, left: number, w: number) => {
      o.getBoundingClientRect = () =>
        ({
          x: left, y: 100, left, top: 100, right: left + w, bottom: 500,
          width: w, height: 400, toJSON: () => ({}),
        }) as DOMRect;
      o.style.setProperty("--overlay-constraint-top", "0px");
      o.style.setProperty("--overlay-constraint-left", "0px");
      o.style.setProperty("--overlay-constraint-width", "1024px");
      o.style.setProperty("--overlay-constraint-height", "768px");
    };

    // Floating inline-end drawer (handle inline-end → anchor inline-start):
    // left edge (200) is far from the constraint left (0).
    const floating = createOverlay({ resize: "inline-end" });
    setRect(floating, 200, 300); // center x 350
    const g1 = new Overlay(floating, { dismissible: false });
    dragX(floating, 250, 310); // grow width by 60 → size 360 (within bounds)
    // x = centerX0 − cl + signX·(size − startSize)/2 = 350 + (360 − 300)/2
    expect(floating.style.getPropertyValue("--overlay-x")).toBe("380px");
    g1.dispose();
    floating.remove();

    // Docked: left (0) flush with the constraint left.
    const docked = createOverlay({ resize: "inline-end" });
    setRect(docked, 0, 300);
    const g2 = new Overlay(docked, { dismissible: false });
    dragX(docked, 250, 310);
    expect(docked.style.getPropertyValue("--overlay-x")).toBe("");
    g2.dispose();
    docked.remove();
  });
});

describe("window move (data-draggable)", () => {
  it("rides --overlay-dx/-dy while dragging, persists --overlay-x/-y", () => {
    const el = createOverlay({ draggable: true });
    mockWindowRect(el);
    const gestures = new Overlay(el, { dismissible: false });

    // Top strip (rect.top = 100): engage and track 1:1 — the live delta
    // rides the transient channels; the persisted point is untouched.
    drag2D(el, { x: 340, y: 110 }, { x: 390, y: 180 });
    expect(el.style.getPropertyValue("--overlay-dx")).toBe("50px");
    expect(el.style.getPropertyValue("--overlay-dy")).toBe("70px");
    expect(el.style.getPropertyValue("--overlay-x")).toBe("");
    expect(el.style.userSelect).toBe("none");

    // Release: the location persists as the rect-relative box center;
    // the transient delta clears. Center was (340, 250) → +50/+70.
    pointerUp(el, { x: 390, y: 180 });
    expect(el.style.getPropertyValue("--overlay-x")).toBe("390px");
    expect(el.style.getPropertyValue("--overlay-y")).toBe("320px");
    expect(el.style.getPropertyValue("--overlay-dx")).toBe("");
    expect(el.style.transition).toBe("");
    expect(el.style.userSelect).toBe("");

    // A second move composes onto the rendered center, not the channels.
    drag2D(el, { x: 340, y: 110 }, { x: 330, y: 100 });
    pointerUp(el, { x: 330, y: 100 });
    expect(el.style.getPropertyValue("--overlay-x")).toBe("330px");
    expect(el.style.getPropertyValue("--overlay-y")).toBe("240px");

    gestures.dispose();
    el.remove();
  });

  it("dragging the window off the constraint closes it", () => {
    const el = createOverlay({ draggable: true });
    mockWindowRect(el);
    el.showModal();
    const gestures = new Overlay(el);

    drag2D(el, { x: 340, y: 110 }, { x: -400, y: 110 });
    // The window followed the pointer off the left edge — rebind the rect
    // to where it now sits before releasing.
    bindRect(el, -640, 100);
    pointerUp(el, { x: -400, y: 110 });
    expect(el.open).toBe(false);

    gestures.dispose();
    el.remove();
  });

  it("rubber-bands the move beyond the constraint edge", () => {
    const el = createOverlay({ draggable: true });
    mockWindowRect(el);
    const gestures = new Overlay(el, { dismissible: false });

    // Center floor is 240 (half the 480 width); raw center 40 overshoots
    // by 200, resisted ÷3 → ≈173, riding the transient dx.
    drag2D(el, { x: 340, y: 110 }, { x: 40, y: 110 });
    const dx = parseFloat(el.style.getPropertyValue("--overlay-dx"));
    expect(dx).toBeLessThan(-100);
    expect(dx).toBeGreaterThan(-300);

    gestures.dispose();
    el.remove();
  });

  it("does not close off the constraint when dismissible is false", () => {
    const el = createOverlay({ draggable: true });
    mockWindowRect(el);
    el.showModal();
    const gestures = new Overlay(el, { dismissible: false });

    drag2D(el, { x: 340, y: 110 }, { x: -400, y: 110 });
    pointerUp(el, { x: -400, y: 110 });
    expect(el.open).toBe(true);
    // Clamped to the constraint: the center floor is half the width.
    expect(el.style.getPropertyValue("--overlay-x")).toBe("240px");

    gestures.dispose();
    el.remove();
  });

  it("dismissing reverts to the channels at the gesture's engage", () => {
    const el = createOverlay({ draggable: true });
    mockWindowRect(el);
    el.style.setProperty("--overlay-x", "11px");
    el.style.setProperty("--overlay-w", "333px");
    el.showModal();
    const gestures = new Overlay(el); // snapshots x=11 at attach

    // The author re-positions AFTER attach (e.g. a morphing panel writing
    // the channels). Dismiss must revert to this, not the attach-time
    // snapshot — so the morph survives a flick-to-dismiss + reopen.
    el.style.setProperty("--overlay-x", "99px");

    // Fling off the constraint → dismiss.
    drag2D(el, { x: 340, y: 110 }, { x: -400, y: 110 });
    bindRect(el, -640, 100);
    pointerUp(el, { x: -400, y: 110 });

    expect(el.open).toBe(false);
    expect(el.style.getPropertyValue("--overlay-x")).toBe("99px");
    expect(el.style.getPropertyValue("--overlay-w")).toBe("333px");

    gestures.dispose();
    el.remove();
  });

  it("pointercancel keeps the persisted location", () => {
    const el = createOverlay({ draggable: true });
    mockWindowRect(el);
    const gestures = new Overlay(el, { dismissible: false });

    drag2D(el, { x: 340, y: 110 }, { x: 390, y: 160 });
    pointerUp(el, { x: 390, y: 160 }); // persisted (390, 300)
    drag2D(el, { x: 340, y: 110 }, { x: 600, y: 400 });
    el.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    expect(el.style.getPropertyValue("--overlay-x")).toBe("390px");
    expect(el.style.getPropertyValue("--overlay-y")).toBe("300px");
    expect(el.style.getPropertyValue("--overlay-dx")).toBe("");

    gestures.dispose();
    el.remove();
  });
});

describe("block-start sheet + draggable (resize handle owns the top)", () => {
  // The resize pill sits at top-center; the drag dot at the top-start
  // corner. Pressing the pill must resize (height), not move.
  it("resizes from the top-center pill, not move", () => {
    const el = createOverlay({ resize: "block-start", draggable: true });
    mockWindowRect(el); // rect (100,100) 480×300 → top strip y 100–128
    const gestures = new Overlay(el, { dismissible: false });

    // Top-center (x 340) is the resize pill, outside the top-start move
    // zone → block (height) resize, no move channels written.
    drag2D(el, { x: 340, y: 110 }, { x: 340, y: 260 });
    expect(el.style.height).not.toBe("");
    expect(el.style.getPropertyValue("--overlay-dx")).toBe("");
    expect(el.style.getPropertyValue("--overlay-x")).toBe("");

    gestures.dispose();
    el.remove();
  });

  it("moves from the top-start dot corner", () => {
    const el = createOverlay({ resize: "block-start", draggable: true });
    mockWindowRect(el);
    const gestures = new Overlay(el, { dismissible: false });

    // Top-start corner (near rect.left = 100) is the drag dot → move.
    drag2D(el, { x: 110, y: 110 }, { x: 160, y: 170 });
    expect(el.style.getPropertyValue("--overlay-dx")).toBe("50px");
    expect(el.style.getPropertyValue("--overlay-dy")).toBe("60px");
    expect(el.style.height).toBe("");

    gestures.dispose();
    el.remove();
  });

  // Resizing a sheet that's floating (dragged off the constraint edge)
  // must pin the handle-less edge by shifting the location point; a sheet
  // docked flush against that edge leaves the location to the CSS clamp.
  it("anchors the opposite edge when floating, not when docked", () => {
    const setRect = (o: HTMLElement, top: number, h: number) => {
      o.getBoundingClientRect = () =>
        ({
          x: 100, y: top, left: 100, top, right: 500, bottom: top + h,
          width: 400, height: h, toJSON: () => ({}),
        }) as DOMRect;
      o.style.setProperty("--overlay-constraint-top", "0px");
      o.style.setProperty("--overlay-constraint-left", "0px");
      o.style.setProperty("--overlay-constraint-width", "1024px");
      o.style.setProperty("--overlay-constraint-height", "768px");
    };

    // Floating: bottom (500) is far from the constraint bottom (768).
    const floating = createOverlay({ resize: "block-start" });
    setRect(floating, 300, 200); // center y 400, bottom 500
    const g1 = new Overlay(floating, { dismissible: false });
    drag(floating, 350, 250); // grow upward → size 300; bottom pinned
    // y = centerY0 − ct + signY·(size − startSize)/2 = 400 + (−1)(300−200)/2
    expect(floating.style.getPropertyValue("--overlay-y")).toBe("350px");
    g1.dispose();
    floating.remove();

    // Docked: bottom (768) is flush with the constraint bottom.
    const docked = createOverlay({ resize: "block-start" });
    setRect(docked, 568, 200); // bottom 768 = constraint bottom
    const g2 = new Overlay(docked, { dismissible: false });
    drag(docked, 600, 500);
    expect(docked.style.getPropertyValue("--overlay-y")).toBe("");
    g2.dispose();
    docked.remove();
  });
});

describe("Constraint", () => {
  it("within syncs an element's rect into the constraint vars and cleans up", () => {
    const el = createOverlay({ draggable: true });
    const container = document.createElement("div");
    document.body.appendChild(container);

    const o = new Overlay(el, { within: container });
    for (const side of ["top", "left", "width", "height"]) {
      expect(
        el.style.getPropertyValue(`--overlay-constraint-${side}`),
      ).toMatch(/px$/);
    }

    o.dispose();
    for (const side of ["top", "left", "width", "height"]) {
      expect(
        el.style.getPropertyValue(`--overlay-constraint-${side}`),
      ).toBe("");
    }

    container.remove();
    el.remove();
  });

  it("within accepts a plain box (and a Constraint instance)", () => {
    const el = createOverlay({ draggable: true });
    const o = new Overlay(el, {
      within: new Constraint({ x: 20, y: 10, w: 300, h: 400 }),
    });
    expect(el.style.getPropertyValue("--overlay-constraint-top")).toBe("10px");
    expect(el.style.getPropertyValue("--overlay-constraint-left")).toBe(
      "20px",
    );
    expect(el.style.getPropertyValue("--overlay-constraint-width")).toBe(
      "300px",
    );
    expect(el.style.getPropertyValue("--overlay-constraint-height")).toBe(
      "400px",
    );
    o.dispose();
    el.remove();
  });

  it("a box-backed Constraint is editable and re-syncs the channels", () => {
    const el = createOverlay({ draggable: true });
    const c = new Constraint({ x: 0, y: 0, w: 500, h: 500 });
    const o = new Overlay(el, { within: c });
    c.set({ w: 800 });
    expect(el.style.getPropertyValue("--overlay-constraint-width")).toBe(
      "800px",
    );
    o.dispose();
    el.remove();
  });

  it("an element-backed Constraint is read-only", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const c = new Constraint(container);
    expect(() => c.set({ w: 100 })).toThrow();
    container.remove();
  });

  it("constrain() clamps position and caps size", () => {
    const c = new Constraint({ x: 100, y: 100, w: 400, h: 300 });
    // Inside → unchanged.
    expect(c.constrain({ x: 150, y: 150, w: 100, h: 100 })).toEqual({
      x: 150, y: 150, w: 100, h: 100,
    });
    // Overflowing → clamped to keep the box inside.
    expect(c.constrain({ x: 480, y: 380, w: 100, h: 100 })).toEqual({
      x: 400, y: 300, w: 100, h: 100,
    });
    expect(c.constrain({ x: 0, y: 0, w: 100, h: 100 })).toEqual({
      x: 100, y: 100, w: 100, h: 100,
    });
    // Oversize → capped to the region.
    expect(c.constrain({ x: 0, y: 0, w: 900, h: 900 })).toEqual({
      x: 100, y: 100, w: 400, h: 300,
    });
  });
});

describe("corner resize (start/end pair data-resize)", () => {
  const WINDOW = { resize: "end-end", draggable: true };

  it("engages only at the corner grip or the top strip", () => {
    const el = createOverlay(WINDOW);
    mockWindowRect(el);
    const gestures = new Overlay(el);

    // Mid-card and bottom-center presses do nothing.
    for (const from of [
      { x: 300, y: 250 },
      { x: 340, y: 395 },
    ]) {
      drag2D(el, from, { x: from.x + 50, y: from.y + 50 });
      expect(el.style.getPropertyValue("--overlay-w")).toBe("");
      expect(el.style.userSelect).toBe("");
    }

    // Corner press resizes — 1:1, the opposite (top inline-start) corner
    // stays anchored: the location point shifts by half the growth.
    drag2D(el, { x: 570, y: 390 }, { x: 620, y: 440 });
    // Live size renders inline (instant); position to the channels.
    expect(el.style.width).toBe("530px");
    expect(el.style.height).toBe("350px");
    expect(el.style.getPropertyValue("--overlay-x")).toBe("365px");
    expect(el.style.getPropertyValue("--overlay-y")).toBe("275px");
    expect(el.style.transition).toBe("none");

    // Free mode: the size persists after release, scaffolding clears.
    pointerUp(el, { x: 620, y: 440 });
    expect(el.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(el.style.getPropertyValue("--overlay-h")).toBe("350px");
    expect(el.style.getPropertyValue("--overlay-x")).toBe("365px");
    expect(el.style.transition).toBe("");
    expect(el.style.userSelect).toBe("");

    gestures.dispose();
    el.remove();
  });

  it("rubber-bands past the constraint bound and clamps on release", () => {
    const el = createOverlay(WINDOW);
    mockWindowRect(el);
    const gestures = new Overlay(el);

    // The anchored left edge sits at 100 in the 1024-wide constraint →
    // max width 924 (the window can never outgrow the rect). Past the room the
    // size pins at 924 and the resisted overshoot rides --overlay-dx, so the
    // whole surface translates past the edge instead of shoving the left edge.
    drag2D(el, { x: 570, y: 390 }, { x: 1600, y: 390 });
    expect(parseFloat(el.style.width)).toBe(924); // pinned at the room
    const slide = parseFloat(el.style.getPropertyValue("--overlay-dx"));
    const overshoot = 480 + (1600 - 570) - 924; // target width past the room
    expect(slide).toBeGreaterThan(0); // overshoot…
    expect(slide).toBeCloseTo(overshoot / 3); // …resisted onto the slide

    pointerUp(el, { x: 1600, y: 390 });
    expect(el.style.getPropertyValue("--overlay-w")).toBe("924px");
    expect(el.style.getPropertyValue("--overlay-dx")).toBe(""); // slide cleared

    gestures.dispose();
    el.remove();
  });

  it("shrinking far past the minimum dismisses", () => {
    const el = createOverlay(WINDOW);
    mockWindowRect(el);
    el.showModal();
    const gestures = new Overlay(el);

    drag2D(el, { x: 570, y: 390 }, { x: 200, y: 200 });
    pointerUp(el, { x: 200, y: 200 });
    expect(el.open).toBe(false);

    gestures.dispose();
    el.remove();
  });

  it("composes onto a moved window (the rendered center is the base)", () => {
    const el = createOverlay(WINDOW);
    mockWindowRect(el);
    const gestures = new Overlay(el, { dismissible: false });

    // Move the window +50/+50…
    drag2D(el, { x: 340, y: 110 }, { x: 390, y: 160 });
    pointerUp(el, { x: 390, y: 160 });
    expect(el.style.getPropertyValue("--overlay-x")).toBe("390px");
    // …the rect now renders at (150, 150); resize from its corner.
    bindRect(el, 150, 150);
    drag2D(el, { x: 620, y: 440 }, { x: 670, y: 490 });
    pointerUp(el, { x: 670, y: 490 });

    expect(el.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(el.style.getPropertyValue("--overlay-x")).toBe("415px");
    expect(el.style.getPropertyValue("--overlay-y")).toBe("325px");

    gestures.dispose();
    el.remove();
  });

  it("bounds follow the constraint rect, not the viewport", () => {
    const el = createOverlay({ draggable: true });
    mockWindowRect(el);
    el.showModal();
    // Confine to a 700×500 region at (50, 50).
    el.style.setProperty("--overlay-constraint-top", "50px");
    el.style.setProperty("--overlay-constraint-left", "50px");
    el.style.setProperty("--overlay-constraint-width", "700px");
    el.style.setProperty("--overlay-constraint-height", "500px");
    const gestures = new Overlay(el, { dismissible: false });

    // Center floor = 50 + 240 = 290 → rect-relative point 240.
    drag2D(el, { x: 340, y: 110 }, { x: -400, y: 110 });
    pointerUp(el, { x: -400, y: 110 });
    expect(el.style.getPropertyValue("--overlay-x")).toBe("240px");

    gestures.dispose();
    el.remove();
  });

  it("engages at the mirrored corner in RTL", () => {
    const el = createOverlay(WINDOW);
    mockWindowRect(el);
    el.style.direction = "rtl";
    const gestures = new Overlay(el);

    // The end-end (block-end inline-end) corner is physically
    // bottom-left: (100, 400). Dragging left grows; anchor is top-right.
    drag2D(el, { x: 110, y: 390 }, { x: 60, y: 440 });
    expect(el.style.width).toBe("530px"); // live size inline
    expect(el.style.height).toBe("350px");
    expect(el.style.getPropertyValue("--overlay-x")).toBe("315px");

    gestures.dispose();
    el.remove();
  });

  it("pointercancel restores the channels captured at engage", () => {
    const el = createOverlay(WINDOW);
    mockWindowRect(el);
    const gestures = new Overlay(el, { dismissible: false });

    // Seed a persisted size/location with a completed resize…
    drag2D(el, { x: 570, y: 390 }, { x: 620, y: 440 });
    pointerUp(el, { x: 620, y: 440 });
    // …then cancel a second one mid-drag.
    drag2D(el, { x: 570, y: 390 }, { x: 700, y: 500 });
    el.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    expect(el.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(el.style.getPropertyValue("--overlay-h")).toBe("350px");
    expect(el.style.getPropertyValue("--overlay-x")).toBe("365px");
    expect(el.style.getPropertyValue("--overlay-y")).toBe("275px");

    gestures.dispose();
    el.remove();
  });
});
