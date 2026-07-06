import { describe, expect, it, vi } from "vitest";
import { constraint, detents, draggable, rubber } from "./index.ts";

function createTarget(left = 100, top = 100): HTMLElement {
  const el = document.createElement("span");
  el.className = "x-overlay-anchor";
  document.body.appendChild(el);
  el.getBoundingClientRect = () =>
    ({ x: left, y: top, left, top, right: left, bottom: top,
       width: 0, height: 0, toJSON: () => ({}) }) as DOMRect;
  return el;
}

function drag(
  handle: Element,
  from: { x: number; y: number },
  to: { x: number; y: number },
  release = true,
) {
  handle.dispatchEvent(
    new PointerEvent("pointerdown", {
      clientX: from.x,
      clientY: from.y,
      button: 0,
      bubbles: true,
    }),
  );
  handle.dispatchEvent(
    new PointerEvent("pointermove", {
      clientX: to.x,
      clientY: to.y,
      bubbles: true,
    }),
  );
  // A second move at the destination settles the velocity — synthetic
  // events have near-zero dt, so a single move reads as a huge flick.
  handle.dispatchEvent(
    new PointerEvent("pointermove", {
      clientX: to.x,
      clientY: to.y,
      bubbles: true,
    }),
  );
  if (release) {
    handle.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: to.x,
        clientY: to.y,
        bubbles: true,
      }),
    );
  }
}

describe("draggable", () => {
  it("moves the target with the pointer from a handle", () => {
    const target = createTarget(100, 100);
    const handle = document.createElement("div");
    document.body.appendChild(handle);
    const service = draggable(target);
    service.attach(handle);

    drag(handle, { x: 10, y: 10 }, { x: 60, y: 40 });
    expect(target.style.left).toBe("150px");
    expect(target.style.top).toBe("130px");

    service.dispose();
    drag(handle, { x: 0, y: 0 }, { x: 500, y: 500 });
    expect(target.style.left).toBe("150px"); // detached listeners

    handle.remove();
    target.remove();
  });

  it("tears a data-follow pin on the first pointer-down (freeze, no jump)", () => {
    const target = createTarget(200, 300);
    target.setAttribute("data-follow", "");
    target.style.setProperty("position-anchor", "--overlay-follow-1");
    const service = draggable(target);
    service.attach(target);

    drag(target, { x: 0, y: 0 }, { x: 5, y: 5 }, false);
    expect(target.hasAttribute("data-follow")).toBe(false);
    expect(target.style.getPropertyValue("position-anchor")).toBe("");
    // Frozen at the rendered rect before the delta applied.
    expect(target.style.left).toBe("205px");
    expect(target.style.top).toBe("305px");

    service.dispose();
    target.remove();
  });

  it("dispatches dragmove and dragend with velocity and rest", () => {
    const target = createTarget(0, 0);
    const service = draggable(target);
    service.attach(target);
    const onMove = vi.fn();
    const onEnd = vi.fn();
    target.addEventListener("dragmove", onMove);
    target.addEventListener("dragend", onEnd);

    drag(target, { x: 0, y: 0 }, { x: 100, y: 50 });
    expect(onMove).toHaveBeenCalled();
    expect(onMove.mock.calls[0][0].detail).toEqual({ x: 100, y: 50 });
    expect(onEnd).toHaveBeenCalledOnce();
    expect(onEnd.mock.calls[0][0].detail.rest).toEqual({ x: 100, y: 50 });

    service.dispose();
    target.remove();
  });

  it("rubber resists past the space edges during the drag", () => {
    const target = createTarget(0, 0);
    const region = constraint({ top: 0, left: 0, width: 200, height: 200 });
    const service = draggable(target, region, rubber());
    service.attach(target);

    drag(target, { x: 0, y: 0 }, { x: 500, y: 0 }, false);
    // Past the 200px bound: 200 + (500 − 200) / resistance — resisted,
    // strictly between the bound and the raw value.
    const left = parseFloat(target.style.left);
    expect(left).toBeGreaterThan(200);
    expect(left).toBeLessThan(500);

    service.dispose();
    target.remove();
  });

  it("settles onto the nearest positional detent on release", () => {
    const target = createTarget(0, 0);
    const space = detents(
      constraint({ top: 0, left: 0, width: 1000, height: 1000 }),
      [0.2, 0.8],
    );
    const service = draggable(target, space);
    service.attach(target);

    drag(target, { x: 0, y: 0 }, { x: 300, y: 300 });
    // 300 projects nearest to the 200 stop on both axes.
    expect(target.style.left).toBe("200px");
    expect(target.style.top).toBe("200px");

    service.dispose();
    target.remove();
  });

  it("a settle effect returning null reports rest: null (dismiss signal)", () => {
    const target = createTarget(0, 0);
    const service = draggable(target, undefined, {
      settle: () => null,
    });
    service.attach(target);
    const onEnd = vi.fn();
    target.addEventListener("dragend", onEnd);

    drag(target, { x: 0, y: 0 }, { x: 50, y: 50 });
    expect(onEnd.mock.calls[0][0].detail.rest).toBeNull();

    service.dispose();
    target.remove();
  });

  it("update() drives the target programmatically", () => {
    const target = createTarget(0, 0);
    const service = draggable(target);
    service.update({ x: 42, y: 24 });
    expect(target.style.left).toBe("42px");
    expect(target.style.top).toBe("24px");
    service.dispose();
    target.remove();
  });
});
