import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createElementSize } from "./element-size.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createElementSize", () => {
  it("returns initial dimensions from getBoundingClientRect", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      top: 0,
      right: 200,
      bottom: 100,
      left: 0,
      toJSON: () => ({}),
    });

    let size!: ReturnType<typeof createElementSize>;
    effectScope(() => {
      size = createElementSize(el);
    });

    expect(size.width()).toBe(200);
    expect(size.height()).toBe(100);
  });

  it("updates when ResizeObserver fires", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
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

    let size!: ReturnType<typeof createElementSize>;
    effectScope(() => {
      size = createElementSize(el);
    });

    observerCallback(
      [{ contentRect: { width: 300, height: 150 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );

    expect(size.width()).toBe(300);
    expect(size.height()).toBe(150);
  });

  it("disconnects the observer on Symbol.dispose", () => {
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", function MockRO() {
      return { observe: vi.fn(), disconnect, unobserve: vi.fn() };
    });

    const el = document.createElement("div");
    document.body.appendChild(el);

    let size!: ReturnType<typeof createElementSize>;
    effectScope(() => {
      size = createElementSize(el);
    });

    size[Symbol.dispose]();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
