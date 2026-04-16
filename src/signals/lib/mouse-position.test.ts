import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createMousePosition } from "./mouse-position.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createMousePosition", () => {
  it("starts at (0, 0)", () => {
    let pos!: ReturnType<typeof createMousePosition>;
    effectScope(() => {
      pos = createMousePosition();
    });
    expect(pos.x()).toBe(0);
    expect(pos.y()).toBe(0);
  });

  it("updates on mousemove", () => {
    let pos!: ReturnType<typeof createMousePosition>;
    effectScope(() => {
      pos = createMousePosition();
    });
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 100, clientY: 200 }),
    );
    expect(pos.x()).toBe(100);
    expect(pos.y()).toBe(200);
  });

  it("stops updating after Symbol.dispose", () => {
    let pos!: ReturnType<typeof createMousePosition>;
    effectScope(() => {
      pos = createMousePosition();
    });
    pos[Symbol.dispose]();
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 99, clientY: 77 }),
    );
    expect(pos.x()).toBe(0);
    expect(pos.y()).toBe(0);
  });
});
