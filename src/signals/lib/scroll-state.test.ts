import { describe, it, expect, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createScrollState } from "./scroll-state.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createScrollState", () => {
  it("starts at (0, 0) for a scrollable element", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let state!: ReturnType<typeof createScrollState>;
    effectScope(() => {
      state = createScrollState(el);
    });

    expect(state.x()).toBe(0);
    expect(state.y()).toBe(0);
    expect(state.directionX()).toBe("none");
    expect(state.directionY()).toBe("none");
  });

  it("updates x/y and direction on scroll", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollLeft", { value: 0, writable: true });
    Object.defineProperty(el, "scrollTop", { value: 0, writable: true });
    document.body.appendChild(el);

    let state!: ReturnType<typeof createScrollState>;
    effectScope(() => {
      state = createScrollState(el);
    });

    // Simulate scrolling right and down
    Object.defineProperty(el, "scrollLeft", { value: 50, writable: true });
    Object.defineProperty(el, "scrollTop", { value: 100, writable: true });
    el.dispatchEvent(new Event("scroll"));

    expect(state.x()).toBe(50);
    expect(state.y()).toBe(100);
    expect(state.directionX()).toBe("right");
    expect(state.directionY()).toBe("down");
  });

  it("reports 'left' and 'up' when scrolling backwards", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollLeft", { value: 100, writable: true });
    Object.defineProperty(el, "scrollTop", { value: 200, writable: true });
    document.body.appendChild(el);

    let state!: ReturnType<typeof createScrollState>;
    effectScope(() => {
      state = createScrollState(el);
    });

    Object.defineProperty(el, "scrollLeft", { value: 50, writable: true });
    Object.defineProperty(el, "scrollTop", { value: 80, writable: true });
    el.dispatchEvent(new Event("scroll"));

    expect(state.directionX()).toBe("left");
    expect(state.directionY()).toBe("up");
  });

  it("removes the scroll listener on Symbol.dispose", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let state!: ReturnType<typeof createScrollState>;
    effectScope(() => {
      state = createScrollState(el);
    });

    state[Symbol.dispose]();

    Object.defineProperty(el, "scrollLeft", { value: 99, writable: true });
    el.dispatchEvent(new Event("scroll"));

    expect(state.x()).toBe(0); // not updated after dispose
  });
});
