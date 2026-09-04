import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope, signal } from "@/signals/index.ts";
import { createElementRect } from "./element-rect.ts";

const live: Array<() => void> = [];
/** Create inside a scope and register teardown — a leaked window listener
 * from one test would otherwise fire during the next one. */
const make = (target: Parameters<typeof createElementRect>[0]) => {
  let rect!: ReturnType<typeof createElementRect>;
  effectScope(() => {
    rect = createElementRect(target);
  });
  live.push(() => rect[Symbol.dispose]());
  return rect;
};

afterEach(() => {
  for (const dispose of live.splice(0)) dispose();
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

    const rect = make(el);

    expect(rect().x).toBe(10);
    expect(rect().y).toBe(20);
    expect(rect().width).toBe(100);
    expect(rect().height).toBe(50);
    expect(rect().top).toBe(20);
    expect(rect().right).toBe(110);
    expect(rect().bottom).toBe(70);
    expect(rect().left).toBe(10);
  });

  it("updates all rect properties when ResizeObserver fires", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    // A mutable mock, not a `mockReturnValueOnce` chain: the test's subject is
    // "an RO callback refreshes every property", not how many times the
    // implementation happens to measure.
    const gbcr = vi.spyOn(el, "getBoundingClientRect");
    gbcr.mockReturnValue({
      x: 0, y: 0, width: 0, height: 0,
      top: 0, right: 0, bottom: 0, left: 0,
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

    const rect = make(el);
    expect(rect().width).toBe(0);

    gbcr.mockReturnValue({
      x: 5, y: 15, width: 200, height: 80,
      top: 15, right: 205, bottom: 95, left: 5,
      toJSON: () => ({}),
    });
    observerCallback(
      [{ target: el } as unknown as ResizeObserverEntry],
      {} as ResizeObserver,
    );

    expect(rect().width).toBe(200);
    expect(rect().height).toBe(80);
    expect(rect().top).toBe(15);
  });

  it("takes size from the entry's border box, not the scaled visual rect", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    // A `scale: 0.94` animation: the rect runs 6% short of the layout box.
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      x: 10, y: 20, width: 94, height: 47,
      top: 20, right: 104, bottom: 67, left: 10,
      toJSON: () => ({}),
    } as DOMRect);

    let observerCallback!: ResizeObserverCallback;
    vi.stubGlobal("ResizeObserver", function MockRO(cb: ResizeObserverCallback) {
      observerCallback = cb;
      return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
    });

    const rect = make(el);
    observerCallback(
      [
        {
          target: el,
          borderBoxSize: [{ inlineSize: 100, blockSize: 50 }],
        } as unknown as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    );

    expect(rect().width).toBe(100);
    expect(rect().height).toBe(50);
    // Position stays the rect's; edges follow the size.
    expect(rect().x).toBe(10);
    expect(rect().y).toBe(20);
    expect(rect().right).toBe(110);
    expect(rect().bottom).toBe(70);
  });

  it("disconnects on Symbol.dispose", () => {
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", function MockRO() {
      return { observe: vi.fn(), disconnect, unobserve: vi.fn() };
    });

    const el = document.createElement("div");
    const rect = make(el);

    rect[Symbol.dispose]();
    expect(disconnect).toHaveBeenCalledOnce();
  });
  it("re-measures when a reactive target changes", () => {
    const a = document.createElement("div");
    const b = document.createElement("div");
    document.body.append(a, b);

    vi.spyOn(a, "getBoundingClientRect").mockReturnValue({
      x: 1, y: 2, width: 3, height: 4,
      top: 2, right: 4, bottom: 6, left: 1,
      toJSON: () => ({}),
    });
    vi.spyOn(b, "getBoundingClientRect").mockReturnValue({
      x: 10, y: 20, width: 30, height: 40,
      top: 20, right: 40, bottom: 60, left: 10,
      toJSON: () => ({}),
    });

    const target = signal<Element>(a);
    const rect = make(target);

    expect(rect().x).toBe(1);
    expect(rect().width).toBe(3);

    target(b);

    expect(rect().x).toBe(10);
    expect(rect().width).toBe(30);
  });

  it("disconnects the previous observer when the target changes", () => {
    const disconnects: number[] = [];
    let created = 0;
    vi.stubGlobal("ResizeObserver", function MockRO() {
      const id = created++;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: () => disconnects.push(id),
      };
    });

    const a = document.createElement("div");
    const b = document.createElement("div");
    const target = signal<Element>(a);

    make(target);

    expect(created).toBe(1);
    expect(disconnects).toEqual([]);

    target(b);

    expect(created).toBe(2);
    expect(disconnects).toEqual([0]);
  });


  const rectAt = (x: number, y: number) => ({
    x, y, width: 10, height: 10,
    top: y, right: x + 10, bottom: y + 10, left: x,
    toJSON: () => ({}),
  });

  it("re-measures position when the viewport resizes", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const gbcr = vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rectAt(100, 50));

    const rect = make(el);
    expect(rect().x).toBe(100);

    // The element moves without changing size — ResizeObserver stays silent.
    gbcr.mockReturnValue(rectAt(30, 50));
    window.dispatchEvent(new Event("resize"));

    expect(rect().x).toBe(30);
  });

  it("re-measures position when an ancestor scrolls", () => {
    const scroller = document.createElement("div");
    const el = document.createElement("div");
    scroller.appendChild(el);
    document.body.appendChild(scroller);
    const gbcr = vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rectAt(0, 200));

    const rect = make(el);
    expect(rect().y).toBe(200);

    gbcr.mockReturnValue(rectAt(0, 40));
    // `scroll` does not bubble; a capture-phase listener on window still sees it.
    scroller.dispatchEvent(new Event("scroll"));

    expect(rect().y).toBe(40);
  });

  it("stops re-measuring after dispose", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const gbcr = vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rectAt(100, 50));

    const rect = make(el);
    rect[Symbol.dispose]();

    gbcr.mockReturnValue(rectAt(30, 50));
    window.dispatchEvent(new Event("resize"));

    expect(rect().x).toBe(100);
  });
});
