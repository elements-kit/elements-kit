import { describe, it, expect } from "vitest";
import { effectScope } from "../index.ts";
import { createElementScroll } from "./element-scroll.ts";

describe("createElementScroll", () => {
  it("starts at 0,0 for a new element", () => {
    const el = document.createElement("div");

    let scroll!: ReturnType<typeof createElementScroll>;
    effectScope(() => {
      scroll = createElementScroll(el);
    });

    expect(scroll.x()).toBe(0);
    expect(scroll.y()).toBe(0);
  });

  it("cleans up on dispose", () => {
    const el = document.createElement("div");

    let scroll!: ReturnType<typeof createElementScroll>;
    effectScope(() => {
      scroll = createElementScroll(el);
    });

    // Should not throw
    scroll[Symbol.dispose]();
  });
});
