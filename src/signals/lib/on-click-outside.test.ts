import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createOnClickOutside } from "./on-click-outside.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createOnClickOutside", () => {
  it("fires handler when clicking outside the target", () => {
    const inside = document.createElement("div");
    const outside = document.createElement("span");
    document.body.append(inside, outside);

    const handler = vi.fn();

    effectScope(() => {
      createOnClickOutside(inside, handler);
    });

    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not fire handler when clicking inside the target", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    const handler = vi.fn();

    effectScope(() => {
      createOnClickOutside(el, handler);
    });

    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not fire after scope disposal", () => {
    const inside = document.createElement("div");
    const outside = document.createElement("span");
    document.body.append(inside, outside);

    const handler = vi.fn();

    const stop = effectScope(() => {
      createOnClickOutside(inside, handler);
    });

    stop();
    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});
