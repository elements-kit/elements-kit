import { describe, it, expect, vi } from "vitest";
import { constrainOverlay } from "./index.ts";
import { closestDetent, createOverlayGestures } from "./index.ts";

function createOverlay(attrs?: {
  resize?: string;
  draggable?: boolean;
}): HTMLDialogElement {
  const overlay = document.createElement("dialog");
  overlay.className = "unset x-overlay";
  if (attrs?.resize !== undefined)
    overlay.setAttribute("data-resize", attrs.resize);
  if (attrs?.draggable) overlay.setAttribute("data-draggable", "");
  const card = document.createElement("div");
  card.className = "x-card";
  card.setAttribute("data-variant", "elevated");
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  return overlay;
}

function drag(overlay: HTMLElement, fromY: number, toY: number) {
  overlay.dispatchEvent(
    new PointerEvent("pointerdown", { clientY: fromY, bubbles: true }),
  );
  overlay.dispatchEvent(
    new PointerEvent("pointermove", { clientY: toY, bubbles: true }),
  );
}

function dragX(overlay: HTMLElement, fromX: number, toX: number) {
  overlay.dispatchEvent(
    new PointerEvent("pointerdown", { clientX: fromX, bubbles: true }),
  );
  overlay.dispatchEvent(
    new PointerEvent("pointermove", { clientX: toX, bubbles: true }),
  );
}

function drag2D(
  overlay: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  overlay.dispatchEvent(
    new PointerEvent("pointerdown", {
      clientX: from.x,
      clientY: from.y,
      bubbles: true,
    }),
  );
  overlay.dispatchEvent(
    new PointerEvent("pointermove", {
      clientX: to.x,
      clientY: to.y,
      bubbles: true,
    }),
  );
}

function pointerUp(overlay: HTMLElement, at: { x?: number; y?: number }) {
  overlay.dispatchEvent(
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
function bindRect(overlay: HTMLElement, left = 100, top = 100) {
  overlay.getBoundingClientRect = () =>
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
function mockWindowRect(overlay: HTMLElement) {
  overlay.style.setProperty("--overlay-constraint-top", "0px");
  overlay.style.setProperty("--overlay-constraint-left", "0px");
  overlay.style.setProperty("--overlay-constraint-width", "1024px");
  overlay.style.setProperty("--overlay-constraint-height", "768px");
  bindRect(overlay);
}

describe("x-overlay markup contract", () => {
  it("is a native <dialog> wrapping a card", () => {
    const overlay = createOverlay({ resize: "block-start" });
    expect(overlay.tagName).toBe("DIALOG");
    expect(overlay.querySelector(":scope > .x-card")).not.toBeNull();
    overlay.remove();
  });

  it("opens modally and closes natively", () => {
    const overlay = createOverlay({ resize: "block-start" });
    const onClose = vi.fn();
    overlay.addEventListener("close", onClose);

    overlay.showModal();
    expect(overlay.open).toBe(true);
    overlay.close();
    expect(overlay.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    overlay.remove();
  });

  it("round-trips the gesture attributes and detent", () => {
    const overlay = createOverlay({
      resize: "end-end",
      draggable: true,
    });
    expect(overlay.getAttribute("data-resize")).toBe("end-end");
    expect(overlay.hasAttribute("data-draggable")).toBe(true);
    overlay.setAttribute("data-detent", "medium");
    expect(overlay.getAttribute("data-detent")).toBe("medium");
    overlay.remove();
  });

  it("supports the popover modality attribute", () => {
    // happy-dom has no Popover API — attribute-level contract only.
    const overlay = createOverlay({ resize: "block-start" });
    overlay.setAttribute("popover", "manual");
    expect(overlay.getAttribute("popover")).toBe("manual");
    overlay.remove();
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

describe("createOverlayGestures", () => {
  it("defaults to the largest allowed detent", () => {
    const overlay = createOverlay({ resize: "block-start" });
    const gestures = createOverlayGestures(overlay);
    expect(gestures.detent).toBe("large");
    gestures.dispose();
    overlay.remove();
  });

  it("setDetent writes the attribute and dispatches detentchange", () => {
    const overlay = createOverlay({ resize: "block-start" });
    const gestures = createOverlayGestures(overlay);
    const onChange = vi.fn();
    overlay.addEventListener("detentchange", onChange);

    gestures.setDetent("small");
    expect(overlay.getAttribute("data-detent")).toBe("small");
    expect(gestures.detent).toBe("small");
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0].detail).toEqual({ detent: "small" });

    // Same detent again — no event.
    gestures.setDetent("small");
    expect(onChange).toHaveBeenCalledOnce();

    gestures.dispose();
    overlay.remove();
  });

  it("ignores detents outside the allowed set", () => {
    const overlay = createOverlay({ resize: "block-start" });
    const gestures = createOverlayGestures(overlay, {
      detents: ["medium", "large"],
    });
    gestures.setDetent("small");
    expect(overlay.hasAttribute("data-detent")).toBe(false);
    expect(gestures.detent).toBe("large");
    gestures.dispose();
    overlay.remove();
  });

  it("engages by data-resize: height on block edges, width on inline", () => {
    // No gesture attributes, or a corner grip away from its zone
    // (rect-bound at zero) — no whole-surface engagement.
    for (const attrs of [
      undefined,
      { resize: "end-end" },
      { resize: "start-start" },
    ]) {
      const overlay = createOverlay(attrs);
      const gestures = createOverlayGestures(overlay);
      drag(overlay, 100, 300);
      expect(overlay.style.height, attrs?.resize).toBe("");
      expect(overlay.style.transition, attrs?.resize).toBe("");
      gestures.dispose();
      overlay.remove();
    }
    for (const resize of ["block-start", "block-end"]) {
      const overlay = createOverlay({ resize });
      const gestures = createOverlayGestures(overlay);
      drag(overlay, 100, 300);
      expect(overlay.style.height, resize).not.toBe("");
      expect(overlay.style.width, resize).toBe("");
      gestures.dispose();
      overlay.remove();
    }
    for (const resize of ["inline-start", "inline-end"]) {
      const overlay = createOverlay({ resize });
      const gestures = createOverlayGestures(overlay);
      dragX(overlay, 100, 300);
      expect(overlay.style.width, resize).not.toBe("");
      expect(overlay.style.height, resize).toBe("");
      gestures.dispose();
      overlay.remove();
    }
  });

  it("does not engage from interactive elements (their click survives)", () => {
    const overlay = createOverlay({ resize: "block-start" });
    const card = overlay.querySelector(".x-card")!;
    const button = document.createElement("button");
    card.appendChild(button);
    const label = document.createElement("label");
    label.className = "x-toggle";
    label.appendChild(document.createElement("input"));
    card.appendChild(label);
    const gestures = createOverlayGestures(overlay);

    for (const el of [button, label]) {
      el.dispatchEvent(
        new PointerEvent("pointerdown", { clientY: 100, bubbles: true }),
      );
      overlay.dispatchEvent(
        new PointerEvent("pointermove", { clientY: 300, bubbles: true }),
      );
      expect(overlay.style.height).toBe("");
      expect(overlay.style.userSelect).toBe("");
    }

    gestures.dispose();
    overlay.remove();
  });

  it("does not engage when data-anchor is element (reserved)", () => {
    const overlay = createOverlay({ resize: "block-start" });
    overlay.setAttribute("data-anchor", "element");
    const gestures = createOverlayGestures(overlay);
    drag(overlay, 100, 300);
    expect(overlay.style.height).toBe("");
    gestures.dispose();
    overlay.remove();
  });

  it("grows toward the handle's pointer direction", () => {
    // happy-dom rects are 0 — height starts at 0, so the driven height is
    // sign * dy clamped at the smallest detent edge; assert direction only.
    // A bottom handle (block-end — top sheet) grows when dragged down.
    const down = createOverlay({ resize: "block-end" });
    const downGestures = createOverlayGestures(down);
    drag(down, 100, 300);
    expect(parseFloat(down.style.height)).toBeGreaterThan(0);
    downGestures.dispose();
    down.remove();

    // A top handle (block-start — bottom sheet) grows when dragged up.
    const up = createOverlay({ resize: "block-start" });
    const upGestures = createOverlayGestures(up);
    drag(up, 300, 100);
    expect(parseFloat(up.style.height)).toBeGreaterThan(0);
    upGestures.dispose();
    up.remove();
  });

  it("slides past the smallest detent via --overlay-dy, never translate", () => {
    const overlay = createOverlay({ resize: "block-start" });
    const gestures = createOverlayGestures(overlay);
    // Dragging down shrinks a bottom sheet below its smallest detent
    // (0px in happy-dom) — the slide-away channel engages.
    drag(overlay, 100, 400);
    expect(overlay.style.getPropertyValue("--overlay-dy")).not.toBe("");
    expect(overlay.style.translate ?? "").toBe("");

    overlay.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    expect(overlay.style.height).toBe("");
    expect(overlay.style.getPropertyValue("--overlay-dy")).toBe("");
    expect(overlay.style.transition).toBe("");
    gestures.dispose();
    overlay.remove();
  });

  it("drag-dismiss closes a dialog and hides a popover otherwise", () => {
    const dialog = createOverlay({ resize: "block-start" });
    dialog.showModal();
    const dialogGestures = createOverlayGestures(dialog);
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
    const popGestures = createOverlayGestures(popover);
    drag(popover, 100, 900);
    popover.dispatchEvent(
      new PointerEvent("pointerup", { clientY: 900, bubbles: true }),
    );
    expect(hidePopover).toHaveBeenCalledOnce();
    popGestures.dispose();
    popover.remove();
  });

  it("stops reacting after dispose", () => {
    const overlay = createOverlay({ resize: "block-start" });
    const gestures = createOverlayGestures(overlay);
    gestures.dispose();

    drag(overlay, 100, 400);
    expect(overlay.style.height).toBe("");
    overlay.remove();
  });

  it("supports Symbol.dispose", () => {
    const overlay = createOverlay({ resize: "block-start" });
    const gestures = createOverlayGestures(overlay);
    expect(typeof gestures[Symbol.dispose]).toBe("function");
    gestures[Symbol.dispose]();
    overlay.remove();
  });

  it("gates the affordances via data-overlay-gestures", () => {
    const overlay = createOverlay({ resize: "block-start" });
    expect(overlay.hasAttribute("data-overlay-gestures")).toBe(false);
    const gestures = createOverlayGestures(overlay);
    expect(overlay.hasAttribute("data-overlay-gestures")).toBe(true);
    gestures.dispose();
    expect(overlay.hasAttribute("data-overlay-gestures")).toBe(false);
    overlay.remove();
  });

  it("suppresses text selection while dragging, restores at rest", () => {
    const overlay = createOverlay({ resize: "block-start" });
    const gestures = createOverlayGestures(overlay);
    drag(overlay, 100, 300);
    expect(overlay.style.userSelect).toBe("none");
    pointerUp(overlay, { y: 300 });
    expect(overlay.style.userSelect).toBe("");
    gestures.dispose();
    overlay.remove();
  });
});

describe("drawer gestures (single inline handle)", () => {
  it("grows away from its handle, direction-aware", () => {
    // LTR inline-end handle (start-docked drawer): dragging right grows.
    const startDocked = createOverlay({ resize: "inline-end" });
    const startGestures = createOverlayGestures(startDocked);
    dragX(startDocked, 100, 300);
    expect(parseFloat(startDocked.style.width)).toBeGreaterThan(0);
    startGestures.dispose();
    startDocked.remove();

    // LTR inline-start handle (end-docked drawer): dragging left grows.
    const endDocked = createOverlay({ resize: "inline-start" });
    const endGestures = createOverlayGestures(endDocked);
    dragX(endDocked, 300, 100);
    expect(parseFloat(endDocked.style.width)).toBeGreaterThan(0);
    endGestures.dispose();
    endDocked.remove();

    // RTL flips the physical sides: an inline-start handle sits at the
    // physical right — dragging right grows.
    const rtl = createOverlay({ resize: "inline-start" });
    rtl.style.direction = "rtl";
    const rtlGestures = createOverlayGestures(rtl);
    dragX(rtl, 100, 300);
    expect(parseFloat(rtl.style.width)).toBeGreaterThan(0);
    rtlGestures.dispose();
    rtl.remove();
  });

  it("slides past the smallest detent via --overlay-dx, never translate", () => {
    // Shrinking an end-docked drawer (inline-start handle) below the
    // smallest detent (0px in happy-dom) — the slide-away channel engages.
    const overlay = createOverlay({ resize: "inline-start" });
    const gestures = createOverlayGestures(overlay);
    dragX(overlay, 300, 400);
    expect(overlay.style.getPropertyValue("--overlay-dx")).not.toBe("");
    expect(overlay.style.translate ?? "").toBe("");
    gestures.dispose();
    overlay.remove();
  });

  it("snap writes data-detent and dismisses past the smallest", () => {
    const dialog = createOverlay({ resize: "inline-start" });
    dialog.showModal();
    const gestures = createOverlayGestures(dialog);
    dragX(dialog, 100, 900); // far toward the docked edge → shrink → dismiss
    pointerUp(dialog, { x: 900 });
    expect(dialog.open).toBe(false);
    gestures.dispose();
    dialog.remove();
  });
});

describe("window move (data-draggable)", () => {
  it("rides --overlay-dx/-dy while dragging, persists --overlay-x/-y", () => {
    const overlay = createOverlay({ draggable: true });
    mockWindowRect(overlay);
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    // Top strip (rect.top = 100): engage and track 1:1 — the live delta
    // rides the transient channels; the persisted point is untouched.
    drag2D(overlay, { x: 340, y: 110 }, { x: 390, y: 180 });
    expect(overlay.style.getPropertyValue("--overlay-dx")).toBe("50px");
    expect(overlay.style.getPropertyValue("--overlay-dy")).toBe("70px");
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("");
    expect(overlay.style.userSelect).toBe("none");

    // Release: the location persists as the rect-relative box center;
    // the transient delta clears. Center was (340, 250) → +50/+70.
    pointerUp(overlay, { x: 390, y: 180 });
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("390px");
    expect(overlay.style.getPropertyValue("--overlay-y")).toBe("320px");
    expect(overlay.style.getPropertyValue("--overlay-dx")).toBe("");
    expect(overlay.style.transition).toBe("");
    expect(overlay.style.userSelect).toBe("");

    // A second move composes onto the rendered center, not the channels.
    drag2D(overlay, { x: 340, y: 110 }, { x: 330, y: 100 });
    pointerUp(overlay, { x: 330, y: 100 });
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("330px");
    expect(overlay.style.getPropertyValue("--overlay-y")).toBe("240px");

    gestures.dispose();
    overlay.remove();
  });

  it("dragging the window off the constraint closes it", () => {
    const overlay = createOverlay({ draggable: true });
    mockWindowRect(overlay);
    overlay.showModal();
    const gestures = createOverlayGestures(overlay);

    drag2D(overlay, { x: 340, y: 110 }, { x: -400, y: 110 });
    // The window followed the pointer off the left edge — rebind the rect
    // to where it now sits before releasing.
    bindRect(overlay, -640, 100);
    pointerUp(overlay, { x: -400, y: 110 });
    expect(overlay.open).toBe(false);

    gestures.dispose();
    overlay.remove();
  });

  it("rubber-bands the move beyond the constraint edge", () => {
    const overlay = createOverlay({ draggable: true });
    mockWindowRect(overlay);
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    // Center floor is 240 (half the 480 width); raw center 40 overshoots
    // by 200, resisted ÷3 → ≈173, riding the transient dx.
    drag2D(overlay, { x: 340, y: 110 }, { x: 40, y: 110 });
    const dx = parseFloat(overlay.style.getPropertyValue("--overlay-dx"));
    expect(dx).toBeLessThan(-100);
    expect(dx).toBeGreaterThan(-300);

    gestures.dispose();
    overlay.remove();
  });

  it("does not close off the constraint when dismissible is false", () => {
    const overlay = createOverlay({ draggable: true });
    mockWindowRect(overlay);
    overlay.showModal();
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    drag2D(overlay, { x: 340, y: 110 }, { x: -400, y: 110 });
    pointerUp(overlay, { x: -400, y: 110 });
    expect(overlay.open).toBe(true);
    // Clamped to the constraint: the center floor is half the width.
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("240px");

    gestures.dispose();
    overlay.remove();
  });

  it("dismissing reverts the dismissing gesture, keeping prior geometry", () => {
    const overlay = createOverlay({ draggable: true });
    mockWindowRect(overlay);
    overlay.style.setProperty("--overlay-w", "333px");
    overlay.showModal();
    const gestures = createOverlayGestures(overlay);

    // Move (persists a new point), then fling the window off-screen. The
    // fling is undone, but the persisted move and the author's untouched
    // width survive (dismiss reverts only the dismissing gesture).
    drag2D(overlay, { x: 340, y: 110 }, { x: 390, y: 160 });
    pointerUp(overlay, { x: 390, y: 160 }); // persists (390, 300)
    drag2D(overlay, { x: 340, y: 110 }, { x: -400, y: 110 });
    bindRect(overlay, -640, 100);
    pointerUp(overlay, { x: -400, y: 110 });

    expect(overlay.open).toBe(false);
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("390px");
    expect(overlay.style.getPropertyValue("--overlay-y")).toBe("300px");
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("333px");
    expect(overlay.style.getPropertyValue("--overlay-h")).toBe("");

    gestures.dispose();
    overlay.remove();
  });

  it("pointercancel keeps the persisted location", () => {
    const overlay = createOverlay({ draggable: true });
    mockWindowRect(overlay);
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    drag2D(overlay, { x: 340, y: 110 }, { x: 390, y: 160 });
    pointerUp(overlay, { x: 390, y: 160 }); // persisted (390, 300)
    drag2D(overlay, { x: 340, y: 110 }, { x: 600, y: 400 });
    overlay.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("390px");
    expect(overlay.style.getPropertyValue("--overlay-y")).toBe("300px");
    expect(overlay.style.getPropertyValue("--overlay-dx")).toBe("");

    gestures.dispose();
    overlay.remove();
  });
});

describe("block-start sheet + draggable (resize handle owns the top)", () => {
  // The resize pill sits at top-center; the drag dot at the top-start
  // corner. Pressing the pill must resize (height), not move.
  it("resizes from the top-center pill, not move", () => {
    const overlay = createOverlay({ resize: "block-start", draggable: true });
    mockWindowRect(overlay); // rect (100,100) 480×300 → top strip y 100–128
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    // Top-center (x 340) is the resize pill, outside the top-start move
    // zone → block (height) resize, no move channels written.
    drag2D(overlay, { x: 340, y: 110 }, { x: 340, y: 260 });
    expect(overlay.style.height).not.toBe("");
    expect(overlay.style.getPropertyValue("--overlay-dx")).toBe("");
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("");

    gestures.dispose();
    overlay.remove();
  });

  it("moves from the top-start dot corner", () => {
    const overlay = createOverlay({ resize: "block-start", draggable: true });
    mockWindowRect(overlay);
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    // Top-start corner (near rect.left = 100) is the drag dot → move.
    drag2D(overlay, { x: 110, y: 110 }, { x: 160, y: 170 });
    expect(overlay.style.getPropertyValue("--overlay-dx")).toBe("50px");
    expect(overlay.style.getPropertyValue("--overlay-dy")).toBe("60px");
    expect(overlay.style.height).toBe("");

    gestures.dispose();
    overlay.remove();
  });
});

describe("constrainOverlay", () => {
  it("syncs the container rect into the constraint vars and cleans up", () => {
    const overlay = createOverlay({ draggable: true });
    const container = document.createElement("div");
    document.body.appendChild(container);

    const constraint = constrainOverlay(overlay, container);
    for (const side of ["top", "left", "width", "height"]) {
      expect(
        overlay.style.getPropertyValue(`--overlay-constraint-${side}`),
      ).toMatch(/px$/);
    }

    constraint.dispose();
    for (const side of ["top", "left", "width", "height"]) {
      expect(
        overlay.style.getPropertyValue(`--overlay-constraint-${side}`),
      ).toBe("");
    }

    container.remove();
    overlay.remove();
  });
});

describe("corner resize (start/end pair data-resize)", () => {
  const WINDOW = { resize: "end-end", draggable: true };

  it("engages only at the corner grip or the top strip", () => {
    const overlay = createOverlay(WINDOW);
    mockWindowRect(overlay);
    const gestures = createOverlayGestures(overlay);

    // Mid-card and bottom-center presses do nothing.
    for (const from of [
      { x: 300, y: 250 },
      { x: 340, y: 395 },
    ]) {
      drag2D(overlay, from, { x: from.x + 50, y: from.y + 50 });
      expect(overlay.style.getPropertyValue("--overlay-w")).toBe("");
      expect(overlay.style.userSelect).toBe("");
    }

    // Corner press resizes — 1:1, the opposite (top inline-start) corner
    // stays anchored: the location point shifts by half the growth.
    drag2D(overlay, { x: 570, y: 390 }, { x: 620, y: 440 });
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(overlay.style.getPropertyValue("--overlay-h")).toBe("350px");
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("365px");
    expect(overlay.style.getPropertyValue("--overlay-y")).toBe("275px");
    expect(overlay.style.transition).toBe("none");

    // Free mode: the size persists after release, scaffolding clears.
    pointerUp(overlay, { x: 620, y: 440 });
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(overlay.style.getPropertyValue("--overlay-h")).toBe("350px");
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("365px");
    expect(overlay.style.transition).toBe("");
    expect(overlay.style.userSelect).toBe("");

    gestures.dispose();
    overlay.remove();
  });

  it("rubber-bands past the constraint bound and clamps on release", () => {
    const overlay = createOverlay(WINDOW);
    mockWindowRect(overlay);
    const gestures = createOverlayGestures(overlay);

    // The anchored left edge sits at 100 in the 1024-wide constraint →
    // max width 924 (the window can never outgrow the rect).
    drag2D(overlay, { x: 570, y: 390 }, { x: 1600, y: 390 });
    const during = parseFloat(overlay.style.getPropertyValue("--overlay-w"));
    expect(during).toBeGreaterThan(924); // overshoot…
    expect(during).toBeLessThan(1510); // …but resisted

    pointerUp(overlay, { x: 1600, y: 390 });
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("924px");

    gestures.dispose();
    overlay.remove();
  });

  it("snaps to detent steps when a detents option is passed", () => {
    const overlay = createOverlay(WINDOW);
    mockWindowRect(overlay);
    const gestures = createOverlayGestures(overlay, {
      detents: ["small", "medium", "large"],
      dismissible: false,
    });
    const onChange = vi.fn();
    overlay.addEventListener("detentchange", onChange);

    drag2D(overlay, { x: 570, y: 390 }, { x: 590, y: 400 });
    pointerUp(overlay, { x: 590, y: 400 });
    // Probe detents are 0px in happy-dom — nearest is the first step.
    expect(overlay.getAttribute("data-detent")).toBe("small");
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("");
    expect(overlay.style.getPropertyValue("--overlay-h")).toBe("");
    expect(onChange).toHaveBeenCalledOnce();

    gestures.dispose();
    overlay.remove();
  });

  it("shrinking far past the minimum dismisses", () => {
    const overlay = createOverlay(WINDOW);
    mockWindowRect(overlay);
    overlay.showModal();
    const gestures = createOverlayGestures(overlay);

    drag2D(overlay, { x: 570, y: 390 }, { x: 200, y: 200 });
    pointerUp(overlay, { x: 200, y: 200 });
    expect(overlay.open).toBe(false);

    gestures.dispose();
    overlay.remove();
  });

  it("composes onto a moved window (the rendered center is the base)", () => {
    const overlay = createOverlay(WINDOW);
    mockWindowRect(overlay);
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    // Move the window +50/+50…
    drag2D(overlay, { x: 340, y: 110 }, { x: 390, y: 160 });
    pointerUp(overlay, { x: 390, y: 160 });
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("390px");
    // …the rect now renders at (150, 150); resize from its corner.
    bindRect(overlay, 150, 150);
    drag2D(overlay, { x: 620, y: 440 }, { x: 670, y: 490 });
    pointerUp(overlay, { x: 670, y: 490 });

    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("415px");
    expect(overlay.style.getPropertyValue("--overlay-y")).toBe("325px");

    gestures.dispose();
    overlay.remove();
  });

  it("bounds follow the constraint rect, not the viewport", () => {
    const overlay = createOverlay({ draggable: true });
    mockWindowRect(overlay);
    overlay.showModal();
    // Confine to a 700×500 region at (50, 50).
    overlay.style.setProperty("--overlay-constraint-top", "50px");
    overlay.style.setProperty("--overlay-constraint-left", "50px");
    overlay.style.setProperty("--overlay-constraint-width", "700px");
    overlay.style.setProperty("--overlay-constraint-height", "500px");
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    // Center floor = 50 + 240 = 290 → rect-relative point 240.
    drag2D(overlay, { x: 340, y: 110 }, { x: -400, y: 110 });
    pointerUp(overlay, { x: -400, y: 110 });
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("240px");

    gestures.dispose();
    overlay.remove();
  });

  it("engages at the mirrored corner in RTL", () => {
    const overlay = createOverlay(WINDOW);
    mockWindowRect(overlay);
    overlay.style.direction = "rtl";
    const gestures = createOverlayGestures(overlay);

    // The end-end (block-end inline-end) corner is physically
    // bottom-left: (100, 400). Dragging left grows; anchor is top-right.
    drag2D(overlay, { x: 110, y: 390 }, { x: 60, y: 440 });
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(overlay.style.getPropertyValue("--overlay-h")).toBe("350px");
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("315px");

    gestures.dispose();
    overlay.remove();
  });

  it("pointercancel restores the channels captured at engage", () => {
    const overlay = createOverlay(WINDOW);
    mockWindowRect(overlay);
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    // Seed a persisted size/location with a completed resize…
    drag2D(overlay, { x: 570, y: 390 }, { x: 620, y: 440 });
    pointerUp(overlay, { x: 620, y: 440 });
    // …then cancel a second one mid-drag.
    drag2D(overlay, { x: 570, y: 390 }, { x: 700, y: 500 });
    overlay.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(overlay.style.getPropertyValue("--overlay-h")).toBe("350px");
    expect(overlay.style.getPropertyValue("--overlay-x")).toBe("365px");
    expect(overlay.style.getPropertyValue("--overlay-y")).toBe("275px");

    gestures.dispose();
    overlay.remove();
  });
});
