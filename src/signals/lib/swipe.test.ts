import { describe, it, expect } from "vitest";
import { effectScope } from "../index.ts";
import { createSwipe } from "./swipe.ts";

describe("createSwipe", () => {
  it("starts with direction none and not swiping", () => {
    let sw!: ReturnType<typeof createSwipe>;
    effectScope(() => {
      sw = createSwipe();
    });

    expect(sw.direction()).toBe("none");
    expect(sw.isSwiping()).toBe(false);
    expect(sw.deltaX()).toBe(0);
    expect(sw.deltaY()).toBe(0);
  });

  it("detects a rightward swipe", () => {
    let sw!: ReturnType<typeof createSwipe>;
    effectScope(() => {
      sw = createSwipe(window, 30);
    });

    window.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 0, clientY: 0 }),
    );
    expect(sw.isSwiping()).toBe(true);

    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 100, clientY: 5 }),
    );
    expect(sw.deltaX()).toBe(100);

    window.dispatchEvent(new PointerEvent("pointerup"));
    expect(sw.isSwiping()).toBe(false);
    expect(sw.direction()).toBe("right");
  });

  it("detects an upward swipe", () => {
    let sw!: ReturnType<typeof createSwipe>;
    effectScope(() => {
      sw = createSwipe(window, 30);
    });

    window.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 200 }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 50, clientY: 50 }),
    );
    window.dispatchEvent(new PointerEvent("pointerup"));

    expect(sw.direction()).toBe("up");
  });

  it("returns none for small movements", () => {
    let sw!: ReturnType<typeof createSwipe>;
    effectScope(() => {
      sw = createSwipe(window, 50);
    });

    window.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 0, clientY: 0 }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 10, clientY: 10 }),
    );
    window.dispatchEvent(new PointerEvent("pointerup"));

    expect(sw.direction()).toBe("none");
  });
});
