import { describe, it, expect, vi } from "vitest";
import { closestDetent, createOverlayGestures } from "./gestures.ts";

function createOverlay(placement?: string): HTMLDialogElement {
  const overlay = document.createElement("dialog");
  overlay.className = "unset x-overlay";
  if (placement !== undefined)
    overlay.setAttribute("data-placement", placement);
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

/** Center-overlay rect: 480×300 at (100, 100) → corner at (580, 400). */
function mockCenterRect(overlay: HTMLElement) {
  overlay.getBoundingClientRect = () =>
    ({
      x: 100,
      y: 100,
      left: 100,
      top: 100,
      right: 580,
      bottom: 400,
      width: 480,
      height: 300,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("x-overlay markup contract", () => {
  it("is a native <dialog> wrapping a card", () => {
    const overlay = createOverlay("block-end");
    expect(overlay.tagName).toBe("DIALOG");
    expect(overlay.querySelector(":scope > .x-card")).not.toBeNull();
    overlay.remove();
  });

  it("opens modally and closes natively", () => {
    const overlay = createOverlay("block-end");
    const onClose = vi.fn();
    overlay.addEventListener("close", onClose);

    overlay.showModal();
    expect(overlay.open).toBe(true);
    overlay.close();
    expect(overlay.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    overlay.remove();
  });

  it("round-trips placement and detent attributes", () => {
    const overlay = createOverlay("block-end inline-end");
    expect(overlay.getAttribute("data-placement")).toBe("block-end inline-end");
    overlay.setAttribute("data-detent", "medium");
    expect(overlay.getAttribute("data-detent")).toBe("medium");
    overlay.remove();
  });

  it("supports the popover modality attribute", () => {
    // happy-dom has no Popover API — attribute-level contract only.
    const overlay = createOverlay("block-end inline-end");
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
    const overlay = createOverlay("block-end");
    const gestures = createOverlayGestures(overlay);
    expect(gestures.detent).toBe("large");
    gestures.dispose();
    overlay.remove();
  });

  it("setDetent writes the attribute and dispatches detentchange", () => {
    const overlay = createOverlay("block-end");
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
    const overlay = createOverlay("block-end");
    const gestures = createOverlayGestures(overlay, {
      detents: ["medium", "large"],
    });
    gestures.setDetent("small");
    expect(overlay.hasAttribute("data-detent")).toBe(false);
    expect(gestures.detent).toBe("large");
    gestures.dispose();
    overlay.remove();
  });

  it("drags height on block-edge placements, width on drawers", () => {
    // center (rect-mocked at zero) never engages away from its corner.
    for (const placement of [undefined, "center"]) {
      const overlay = createOverlay(placement);
      const gestures = createOverlayGestures(overlay);
      drag(overlay, 100, 300);
      expect(overlay.style.height).toBe("");
      expect(overlay.style.transition).toBe("");
      gestures.dispose();
      overlay.remove();
    }
    for (const placement of [
      "block-end",
      "block-start",
      "block-end inline-end",
      "inline-start block-end", // word order doesn't matter
    ]) {
      const overlay = createOverlay(placement);
      const gestures = createOverlayGestures(overlay);
      drag(overlay, 100, 300);
      expect(overlay.style.height, placement).not.toBe("");
      expect(overlay.style.width, placement).toBe("");
      gestures.dispose();
      overlay.remove();
    }
    for (const placement of ["inline-start", "inline-end"]) {
      const overlay = createOverlay(placement);
      const gestures = createOverlayGestures(overlay);
      dragX(overlay, 100, 300);
      expect(overlay.style.width, placement).not.toBe("");
      expect(overlay.style.height, placement).toBe("");
      gestures.dispose();
      overlay.remove();
    }
  });

  it("does not engage from interactive elements (their click survives)", () => {
    const overlay = createOverlay("block-end");
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
    const overlay = createOverlay("block-end");
    overlay.setAttribute("data-anchor", "element");
    const gestures = createOverlayGestures(overlay);
    drag(overlay, 100, 300);
    expect(overlay.style.height).toBe("");
    gestures.dispose();
    overlay.remove();
  });

  it("drags along the placement's direction", () => {
    // happy-dom rects are 0 — height starts at 0, so the driven height is
    // sign * dy clamped at the smallest detent edge; assert direction only.
    const down = createOverlay("block-start");
    const downGestures = createOverlayGestures(down);
    drag(down, 100, 300); // pointer down 200px → top family grows
    const grown = parseFloat(down.style.height);
    expect(grown).toBeGreaterThan(0);
    downGestures.dispose();
    down.remove();

    const up = createOverlay("block-end");
    const upGestures = createOverlayGestures(up);
    drag(up, 300, 100); // pointer up 200px → bottom family grows
    expect(parseFloat(up.style.height)).toBeGreaterThan(0);
    upGestures.dispose();
    up.remove();
  });

  it("slides past the smallest detent via --overlay-dy, never translate", () => {
    const overlay = createOverlay("block-end");
    const gestures = createOverlayGestures(overlay);
    // Dragging down shrinks a bottom sheet below its smallest detent
    // (0px in happy-dom) — the slide-away channel engages.
    drag(overlay, 100, 400);
    expect(overlay.style.getPropertyValue("--overlay-dy")).not.toBe("");
    expect(overlay.style.translate ?? "").toBe("");

    overlay.dispatchEvent(
      new PointerEvent("pointercancel", { bubbles: true }),
    );
    expect(overlay.style.height).toBe("");
    expect(overlay.style.getPropertyValue("--overlay-dy")).toBe("");
    expect(overlay.style.transition).toBe("");
    gestures.dispose();
    overlay.remove();
  });

  it("drag-dismiss closes a dialog and hides a popover otherwise", () => {
    const dialog = createOverlay("block-end");
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
    popover.setAttribute("data-placement", "block-end inline-end");
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
    const overlay = createOverlay("block-end");
    const gestures = createOverlayGestures(overlay);
    gestures.dispose();

    drag(overlay, 100, 400);
    expect(overlay.style.height).toBe("");
    overlay.remove();
  });

  it("supports Symbol.dispose", () => {
    const overlay = createOverlay("block-end");
    const gestures = createOverlayGestures(overlay);
    expect(typeof gestures[Symbol.dispose]).toBe("function");
    gestures[Symbol.dispose]();
    overlay.remove();
  });

  it("gates the affordances via data-overlay-gestures", () => {
    const overlay = createOverlay("block-end");
    expect(overlay.hasAttribute("data-overlay-gestures")).toBe(false);
    const gestures = createOverlayGestures(overlay);
    expect(overlay.hasAttribute("data-overlay-gestures")).toBe(true);
    gestures.dispose();
    expect(overlay.hasAttribute("data-overlay-gestures")).toBe(false);
    overlay.remove();
  });

  it("suppresses text selection while dragging, restores at rest", () => {
    const overlay = createOverlay("block-end");
    const gestures = createOverlayGestures(overlay);
    drag(overlay, 100, 300);
    expect(overlay.style.userSelect).toBe("none");
    pointerUp(overlay, { y: 300 });
    expect(overlay.style.userSelect).toBe("");
    gestures.dispose();
    overlay.remove();
  });
});

describe("drawer gestures (inline placements)", () => {
  it("grows away from its edge, direction-aware", () => {
    // LTR inline-start (left edge): dragging right grows.
    const start = createOverlay("inline-start");
    const startGestures = createOverlayGestures(start);
    dragX(start, 100, 300);
    expect(parseFloat(start.style.width)).toBeGreaterThan(0);
    startGestures.dispose();
    start.remove();

    // LTR inline-end (right edge): dragging left grows.
    const end = createOverlay("inline-end");
    const endGestures = createOverlayGestures(end);
    dragX(end, 300, 100);
    expect(parseFloat(end.style.width)).toBeGreaterThan(0);
    endGestures.dispose();
    end.remove();

    // RTL inline-start sits at the right edge: dragging left grows.
    const rtl = createOverlay("inline-start");
    rtl.style.direction = "rtl";
    const rtlGestures = createOverlayGestures(rtl);
    dragX(rtl, 300, 100);
    expect(parseFloat(rtl.style.width)).toBeGreaterThan(0);
    rtlGestures.dispose();
    rtl.remove();
  });

  it("slides past the smallest detent via --overlay-dx, never translate", () => {
    // Dragging an inline-start drawer toward its left edge shrinks it
    // below the smallest detent (0px in happy-dom) — the slide-away
    // channel engages.
    const overlay = createOverlay("inline-start");
    const gestures = createOverlayGestures(overlay);
    dragX(overlay, 300, 100);
    expect(overlay.style.getPropertyValue("--overlay-dx")).not.toBe("");
    expect(overlay.style.translate ?? "").toBe("");
    gestures.dispose();
    overlay.remove();
  });

  it("snap writes data-detent and dismisses past the smallest", () => {
    const dialog = createOverlay("inline-end");
    dialog.showModal();
    const gestures = createOverlayGestures(dialog);
    dragX(dialog, 100, 900); // far toward the right edge → shrink → dismiss
    pointerUp(dialog, { x: 900 });
    expect(dialog.open).toBe(false);
    gestures.dispose();
    dialog.remove();
  });
});

describe("center window move (top grabber)", () => {
  it("moves via --overlay-mx/-my, persists, and accumulates", () => {
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    // Top strip (rect.top = 100): engage and track 1:1 — the live delta
    // rides the transient channel; the persisted position is untouched.
    drag2D(overlay, { x: 340, y: 110 }, { x: 390, y: 180 });
    expect(overlay.style.getPropertyValue("--overlay-dx")).toBe("50px");
    expect(overlay.style.getPropertyValue("--overlay-dy")).toBe("70px");
    expect(overlay.style.getPropertyValue("--overlay-mx")).toBe("");
    expect(overlay.style.userSelect).toBe("none");

    // Release: position persists in mx/my, the transient delta clears.
    pointerUp(overlay, { x: 390, y: 180 });
    expect(overlay.style.getPropertyValue("--overlay-mx")).toBe("50px");
    expect(overlay.style.getPropertyValue("--overlay-my")).toBe("70px");
    expect(overlay.style.getPropertyValue("--overlay-dx")).toBe("");
    expect(overlay.style.transition).toBe("");
    expect(overlay.style.userSelect).toBe("");

    // A second move continues from the persisted offset.
    drag2D(overlay, { x: 340, y: 110 }, { x: 330, y: 100 });
    pointerUp(overlay, { x: 330, y: 100 });
    expect(overlay.style.getPropertyValue("--overlay-mx")).toBe("40px");
    expect(overlay.style.getPropertyValue("--overlay-my")).toBe("60px");

    gestures.dispose();
    overlay.remove();
  });

  it("dragging the window off-screen closes it", () => {
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
    overlay.showModal();
    const gestures = createOverlayGestures(overlay);

    drag2D(overlay, { x: 340, y: 110 }, { x: -400, y: 110 });
    // The window followed the pointer off the left edge — rebind the rect
    // to where it now sits before releasing.
    overlay.getBoundingClientRect = () =>
      ({
        x: -640,
        y: 100,
        left: -640,
        top: 100,
        right: -160,
        bottom: 400,
        width: 480,
        height: 300,
        toJSON: () => ({}),
      }) as DOMRect;
    pointerUp(overlay, { x: -400, y: 110 });
    expect(overlay.open).toBe(false);

    gestures.dispose();
    overlay.remove();
  });

  it("rubber-bands the move beyond the viewport edge", () => {
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    // Base left is 100 → offset floor -100; overshoot is resisted ÷3:
    // raw -300 → -100 + (-200 / 3) ≈ -166.67, riding the transient dx.
    drag2D(overlay, { x: 340, y: 110 }, { x: 40, y: 110 });
    const dx = parseFloat(overlay.style.getPropertyValue("--overlay-dx"));
    expect(dx).toBeLessThan(-100);
    expect(dx).toBeGreaterThan(-300);

    gestures.dispose();
    overlay.remove();
  });

  it("does not close off-screen when dismissible is false", () => {
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
    overlay.showModal();
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    drag2D(overlay, { x: 340, y: 110 }, { x: -400, y: 110 });
    pointerUp(overlay, { x: -400, y: 110 });
    expect(overlay.open).toBe(true);
    // Clamped to the viewport: base left is 100 → offset floor is -100.
    expect(overlay.style.getPropertyValue("--overlay-mx")).toBe("-100px");

    gestures.dispose();
    overlay.remove();
  });

  it("dismissing resets the persisted position and size", () => {
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
    overlay.showModal();
    const gestures = createOverlayGestures(overlay);

    // Seed a persisted position, then fling it off-screen.
    drag2D(overlay, { x: 340, y: 110 }, { x: 390, y: 160 });
    pointerUp(overlay, { x: 390, y: 160 });
    drag2D(overlay, { x: 340, y: 110 }, { x: -400, y: 110 });
    overlay.getBoundingClientRect = () =>
      ({
        x: -640,
        y: 100,
        left: -640,
        top: 100,
        right: -160,
        bottom: 400,
        width: 480,
        height: 300,
        toJSON: () => ({}),
      }) as DOMRect;
    pointerUp(overlay, { x: -400, y: 110 });

    expect(overlay.open).toBe(false);
    expect(overlay.style.getPropertyValue("--overlay-mx")).toBe("");
    expect(overlay.style.getPropertyValue("--overlay-my")).toBe("");
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("");
    expect(overlay.style.getPropertyValue("--overlay-h")).toBe("");

    gestures.dispose();
    overlay.remove();
  });

  it("pointercancel restores the previous offset", () => {
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    drag2D(overlay, { x: 340, y: 110 }, { x: 390, y: 160 });
    pointerUp(overlay, { x: 390, y: 160 }); // persisted 50/50
    drag2D(overlay, { x: 340, y: 110 }, { x: 600, y: 400 });
    overlay.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    expect(overlay.style.getPropertyValue("--overlay-mx")).toBe("50px");
    expect(overlay.style.getPropertyValue("--overlay-my")).toBe("50px");

    gestures.dispose();
    overlay.remove();
  });
});

describe("center corner resize", () => {
  it("engages only at the corner grip or the top strip", () => {
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
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

    // Corner press resizes — 1:1, anchored at the top inline-start corner
    // (the offsets shift by half the growth to pin it).
    drag2D(overlay, { x: 570, y: 390 }, { x: 620, y: 440 });
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(overlay.style.getPropertyValue("--overlay-h")).toBe("350px");
    expect(overlay.style.getPropertyValue("--overlay-mx")).toBe("25px");
    expect(overlay.style.getPropertyValue("--overlay-my")).toBe("25px");
    expect(overlay.style.transition).toBe("none");

    // Free mode: the size persists after release, scaffolding clears.
    pointerUp(overlay, { x: 620, y: 440 });
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(overlay.style.getPropertyValue("--overlay-h")).toBe("350px");
    expect(overlay.style.getPropertyValue("--overlay-mx")).toBe("25px");
    expect(overlay.style.transition).toBe("");
    expect(overlay.style.userSelect).toBe("");

    gestures.dispose();
    overlay.remove();
  });

  it("rubber-bands past the viewport bound and clamps on release", () => {
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
    const gestures = createOverlayGestures(overlay);

    // happy-dom viewport is 1024×768; the anchored left edge sits at 100
    // → max width 924 (the window can never outgrow the viewport).
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
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
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
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
    overlay.showModal();
    const gestures = createOverlayGestures(overlay);

    drag2D(overlay, { x: 570, y: 390 }, { x: 200, y: 200 });
    pointerUp(overlay, { x: 200, y: 200 });
    expect(overlay.open).toBe(false);

    gestures.dispose();
    overlay.remove();
  });

  it("keeps a persisted window position across a resize", () => {
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
    const gestures = createOverlayGestures(overlay, { dismissible: false });

    // Seed a move…
    drag2D(overlay, { x: 340, y: 110 }, { x: 390, y: 160 });
    pointerUp(overlay, { x: 390, y: 160 });
    // …then resize from the corner: the anchored-corner shift composes
    // onto the persisted position instead of wiping it.
    drag2D(overlay, { x: 570, y: 390 }, { x: 620, y: 440 });
    pointerUp(overlay, { x: 620, y: 440 });

    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(overlay.style.getPropertyValue("--overlay-mx")).toBe("75px");
    expect(overlay.style.getPropertyValue("--overlay-my")).toBe("75px");

    gestures.dispose();
    overlay.remove();
  });

  it("engages at the mirrored corner in RTL", () => {
    const overlay = createOverlay("center");
    mockCenterRect(overlay);
    overlay.style.direction = "rtl";
    const gestures = createOverlayGestures(overlay);

    // Bottom inline-end corner is physically bottom-left: (100, 400).
    // Dragging left grows; the anchored corner is top-right.
    drag2D(overlay, { x: 110, y: 390 }, { x: 60, y: 440 });
    expect(overlay.style.getPropertyValue("--overlay-w")).toBe("530px");
    expect(overlay.style.getPropertyValue("--overlay-h")).toBe("350px");
    expect(overlay.style.getPropertyValue("--overlay-mx")).toBe("-25px");

    gestures.dispose();
    overlay.remove();
  });
});
