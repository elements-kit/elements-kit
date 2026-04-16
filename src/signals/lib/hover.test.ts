import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createHover } from "./hover.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("createHover", () => {
  it("starts as false", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let hovered!: ReturnType<typeof createHover>;
    effectScope(() => {
      hovered = createHover(el);
    });

    expect(hovered()).toBe(false);
  });

  it("becomes true on pointerenter", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let hovered!: ReturnType<typeof createHover>;
    effectScope(() => {
      hovered = createHover(el);
    });

    el.dispatchEvent(new PointerEvent("pointerenter"));
    expect(hovered()).toBe(true);
  });

  it("becomes false on pointerleave", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let hovered!: ReturnType<typeof createHover>;
    effectScope(() => {
      hovered = createHover(el);
    });

    el.dispatchEvent(new PointerEvent("pointerenter"));
    el.dispatchEvent(new PointerEvent("pointerleave"));
    expect(hovered()).toBe(false);
  });

  it("removes listeners on Symbol.dispose", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let hovered!: ReturnType<typeof createHover>;
    effectScope(() => {
      hovered = createHover(el);
    });

    hovered[Symbol.dispose]();
    el.dispatchEvent(new PointerEvent("pointerenter"));
    expect(hovered()).toBe(false); // not updated after dispose
  });

  it("works with a reactive getter target", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let hovered!: ReturnType<typeof createHover>;
    effectScope(() => {
      hovered = createHover(() => el);
    });

    el.dispatchEvent(new PointerEvent("pointerenter"));
    expect(hovered()).toBe(true);
  });
});
