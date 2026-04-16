import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createResizeObserver } from "./resize-observer.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("createResizeObserver", () => {
  it("observes a target element", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const observe = vi.fn();
    vi.stubGlobal("ResizeObserver", function MockRO() {
      return { observe, disconnect: vi.fn() };
    });

    effectScope(() => {
      createResizeObserver(target, vi.fn());
    });

    expect(observe).toHaveBeenCalledWith(target);
  });

  it("disconnects on Symbol.dispose", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", function MockRO() {
      return { observe: vi.fn(), disconnect };
    });

    let ro!: Disposable;
    effectScope(() => {
      ro = createResizeObserver(target, vi.fn());
    });
    ro[Symbol.dispose]();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
