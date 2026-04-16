import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createLongPress } from "./long-press.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createLongPress", () => {
  it("does not fire handler on short press", () => {
    vi.useFakeTimers();
    const el = document.createElement("button");
    document.body.appendChild(el);
    const handler = vi.fn();

    effectScope(() => {
      createLongPress(el, handler, { delay: 500 });
    });

    el.dispatchEvent(new PointerEvent("pointerdown"));
    vi.advanceTimersByTime(200);
    el.dispatchEvent(new PointerEvent("pointerup"));
    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it("fires handler after delay", () => {
    vi.useFakeTimers();
    const el = document.createElement("button");
    document.body.appendChild(el);
    const handler = vi.fn();

    effectScope(() => {
      createLongPress(el, handler, { delay: 500 });
    });

    el.dispatchEvent(new PointerEvent("pointerdown"));
    vi.advanceTimersByTime(600);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("cancels when pointer moves", () => {
    vi.useFakeTimers();
    const el = document.createElement("button");
    document.body.appendChild(el);
    const handler = vi.fn();

    effectScope(() => {
      createLongPress(el, handler, { delay: 500 });
    });

    el.dispatchEvent(new PointerEvent("pointerdown"));
    vi.advanceTimersByTime(200);
    el.dispatchEvent(new PointerEvent("pointermove"));
    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });
});
