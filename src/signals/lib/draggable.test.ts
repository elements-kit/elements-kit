import { describe, it, expect } from "vitest";
import { effectScope } from "../index.ts";
import { createDraggable } from "./draggable.ts";

describe("createDraggable", () => {
  it("starts at 0,0 and not dragging", () => {
    const el = document.createElement("div");

    let drag!: ReturnType<typeof createDraggable>;
    effectScope(() => {
      drag = createDraggable(el);
    });

    expect(drag.x()).toBe(0);
    expect(drag.y()).toBe(0);
    expect(drag.isDragging()).toBe(false);
  });

  it("starts dragging on pointerdown", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let drag!: ReturnType<typeof createDraggable>;
    effectScope(() => {
      drag = createDraggable(el);
    });

    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 10, clientY: 20 }),
    );
    expect(drag.isDragging()).toBe(true);
  });

  it("cleans up on dispose", () => {
    const el = document.createElement("div");

    let drag!: ReturnType<typeof createDraggable>;
    effectScope(() => {
      drag = createDraggable(el);
    });

    drag[Symbol.dispose]();
    expect(drag.isDragging()).toBe(false);
  });
});
