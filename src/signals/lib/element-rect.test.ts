import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createElementRect } from "./element-rect.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createElementRect", () => {
  it("returns initial rect values from getBoundingClientRect", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      top: 20,
      right: 110,
      bottom: 70,
      left: 10,
      toJSON: () => ({}),
    });

    let rect!: ReturnType<typeof createElementRect>;
    effectScope(() => {
      rect = createElementRect(el);
    });

    expect(rect.x()).toBe(10);
    expect(rect.y()).toBe(20);
    expect(rect.width()).toBe(100);
    expect(rect.height()).toBe(50);
    expect(rect.top()).toBe(20);
    expect(rect.right()).toBe(110);
    expect(rect.bottom()).toBe(70);
    expect(rect.left()).toBe(10);
  });

  it("updates all rect properties when ResizeObserver fires", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect")
      .mockReturnValueOnce({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        toJSON: () => ({}),
      })
      .mockReturnValueOnce({
        x: 5,
        y: 15,
        width: 200,
        height: 80,
        top: 15,
        right: 205,
        bottom: 95,
        left: 5,
        toJSON: () => ({}),
      });

    let observerCallback!: ResizeObserverCallback;
    vi.stubGlobal(
      "ResizeObserver",
      function MockRO(cb: ResizeObserverCallback) {
        observerCallback = cb;
        return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
      },
    );

    let rect!: ReturnType<typeof createElementRect>;
    effectScope(() => {
      rect = createElementRect(el);
    });

    observerCallback(
      [{ target: el } as unknown as ResizeObserverEntry],
      {} as ResizeObserver,
    );

    expect(rect.width()).toBe(200);
    expect(rect.height()).toBe(80);
    expect(rect.top()).toBe(15);
  });

  it("disconnects on Symbol.dispose", () => {
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", function MockRO() {
      return { observe: vi.fn(), disconnect, unobserve: vi.fn() };
    });

    const el = document.createElement("div");
    let rect!: ReturnType<typeof createElementRect>;
    effectScope(() => {
      rect = createElementRect(el);
    });

    rect[Symbol.dispose]();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
