import { describe, it, expect } from "vitest";
import { effectScope } from "@/signals/index.ts";
import { elementScroll } from "./element-scroll.ts";

describe("createElementScroll", () => {
  it("starts at 0,0 for a new element", () => {
    const el = document.createElement("div");

    let scroll!: ReturnType<typeof elementScroll>;
    effectScope(() => {
      scroll = elementScroll(el);
    });

    expect(scroll.x()).toBe(0);
    expect(scroll.y()).toBe(0);
  });

  it("cleans up on dispose", () => {
    const el = document.createElement("div");

    let scroll!: ReturnType<typeof elementScroll>;
    effectScope(() => {
      scroll = elementScroll(el);
    });

    // Should not throw
    scroll[Symbol.dispose]();
  });
});
