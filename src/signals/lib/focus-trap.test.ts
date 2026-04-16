import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createFocusTrap } from "./focus-trap.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createFocusTrap", () => {
  it("focuses the first focusable element", () => {
    const div = document.createElement("div");
    const btn = document.createElement("button");
    btn.textContent = "Click";
    div.appendChild(btn);
    document.body.appendChild(div);

    effectScope(() => {
      createFocusTrap(div);
    });

    expect(document.activeElement).toBe(btn);
  });

  it("wraps Tab from last to first", () => {
    const div = document.createElement("div");
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("button");
    div.appendChild(btn1);
    div.appendChild(btn2);
    document.body.appendChild(div);

    effectScope(() => {
      createFocusTrap(div);
    });

    btn2.focus();
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
    });
    const pd = vi.spyOn(event, "preventDefault");
    div.dispatchEvent(event);
    expect(pd).toHaveBeenCalled();
  });

  it("wraps Shift+Tab from first to last", () => {
    const div = document.createElement("div");
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("button");
    div.appendChild(btn1);
    div.appendChild(btn2);
    document.body.appendChild(div);

    effectScope(() => {
      createFocusTrap(div);
    });

    // First element is focused by the trap
    expect(document.activeElement).toBe(btn1);
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    });
    const pd = vi.spyOn(event, "preventDefault");
    div.dispatchEvent(event);
    expect(pd).toHaveBeenCalled();
  });

  it("restores focus on dispose", () => {
    const outer = document.createElement("button");
    document.body.appendChild(outer);
    outer.focus();

    const div = document.createElement("div");
    const btn = document.createElement("button");
    div.appendChild(btn);
    document.body.appendChild(div);

    let trap!: Disposable;
    effectScope(() => {
      trap = createFocusTrap(div);
    });

    expect(document.activeElement).toBe(btn);
    trap[Symbol.dispose]();
    expect(document.activeElement).toBe(outer);
  });
});
