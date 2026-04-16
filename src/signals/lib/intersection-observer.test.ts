import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createIntersectionObserver } from "./intersection-observer.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("createIntersectionObserver", () => {
  it("observes a target element", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const observe = vi.fn();
    vi.stubGlobal("IntersectionObserver", function MockIO() {
      return { observe, disconnect: vi.fn() };
    });

    effectScope(() => {
      createIntersectionObserver(target, vi.fn());
    });

    expect(observe).toHaveBeenCalledWith(target);
  });

  it("disconnects on Symbol.dispose", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", function MockIO() {
      return { observe: vi.fn(), disconnect };
    });

    let io!: Disposable;
    effectScope(() => {
      io = createIntersectionObserver(target, vi.fn());
    });
    io[Symbol.dispose]();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
