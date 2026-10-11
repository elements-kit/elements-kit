import { describe, it, expect, vi, afterEach } from "vitest";
import { effect, effectScope, isReactive, signal } from "@/signals/index.ts";
import { createElementRect, type ElementRect } from "./element-rect.ts";

const live: Array<() => void> = [];
/** Create inside a scope and register teardown — a leaked window listener
 * from one test would otherwise fire during the next one. */
const make = (target: Parameters<typeof createElementRect>[0]) => {
  let rect!: ElementRect;
  effectScope(() => {
    rect = createElementRect(target);
  });
  live.push(() => rect[Symbol.dispose]());
  return rect;
};

/** Read every field as callers do — from an effect, which is what keeps the
 * rect tracking — and return the latest values. */
const watch = (rect: ElementRect) => {
  const seen = { x: 0, y: 0, width: 0, height: 0 };
  live.push(
    effect(() => {
      seen.x = rect.x();
      seen.y = rect.y();
      seen.width = rect.width();
      seen.height = rect.height();
    }),
  );
  return seen;
};

const box = (x: number, y: number, width = 10, height = 10) =>
  ({
    x, y, width, height,
    top: y, right: x + width, bottom: y + height, left: x,
    toJSON: () => ({}),
  }) as DOMRect;

/** A ResizeObserver stand-in whose callback the test fires. */
const fakeObserver = () => {
  const handle = {
    fire: (_entries: Partial<ResizeObserverEntry>[]) => {},
    created: 0,
    disconnects: [] as number[],
  };
  vi.stubGlobal("ResizeObserver", function MockRO(cb: ResizeObserverCallback) {
    const id = handle.created++;
    handle.fire = (entries) => cb(entries as ResizeObserverEntry[], {} as ResizeObserver);
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: () => handle.disconnects.push(id) };
  });
  return handle;
};

const element = (rect: DOMRect) => {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const gbcr = vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect);
  return { el, gbcr };
};

afterEach(() => {
  for (const dispose of live.splice(0)) dispose();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createElementRect", () => {
  it("reads position and size from the element", () => {
    const { el } = element(box(10, 20, 100, 50));
    const seen = watch(make(el));

    expect(seen).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it("refreshes every field when the ResizeObserver fires", () => {
    const ro = fakeObserver();
    const { el, gbcr } = element(box(0, 0, 0, 0));
    const seen = watch(make(el));
    expect(seen.width).toBe(0);

    gbcr.mockReturnValue(box(5, 15, 200, 80));
    ro.fire([{ target: el }]);

    expect(seen).toEqual({ x: 5, y: 15, width: 200, height: 80 });
  });

  it("takes size from the entry's border box, not the scaled visual rect", () => {
    const ro = fakeObserver();
    // A `scale: 0.94` animation: the rect runs 6% short of the layout box.
    const { el } = element(box(10, 20, 94, 47));
    const seen = watch(make(el));

    ro.fire([
      {
        target: el,
        borderBoxSize: [{ inlineSize: 100, blockSize: 50 }] as unknown as readonly ResizeObserverSize[],
      },
    ]);

    expect(seen).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it("re-measures position when the viewport resizes", () => {
    const { el, gbcr } = element(box(100, 50));
    const seen = watch(make(el));

    // The element moves without changing size — ResizeObserver stays silent.
    gbcr.mockReturnValue(box(30, 50));
    window.dispatchEvent(new Event("resize"));

    expect(seen.x).toBe(30);
  });

  it("re-measures position when an ancestor scrolls", () => {
    const scroller = document.createElement("div");
    document.body.appendChild(scroller);
    const { el, gbcr } = element(box(0, 200));
    scroller.appendChild(el);
    const seen = watch(make(el));

    gbcr.mockReturnValue(box(0, 40));
    // `scroll` does not bubble; a capture-phase listener on window still sees it.
    scroller.dispatchEvent(new Event("scroll"));

    expect(seen.y).toBe(40);
  });

  it("re-measures when the document scrolls", () => {
    const { el, gbcr } = element(box(0, 200));
    const seen = watch(make(el));

    gbcr.mockReturnValue(box(0, 40));
    document.dispatchEvent(new Event("scroll"));

    expect(seen.y).toBe(40);
  });

  it("ignores a scroll in a container that doesn't hold it", () => {
    const other = document.createElement("div");
    document.body.appendChild(other);
    const { el, gbcr } = element(box(0, 200));
    watch(make(el));
    gbcr.mockClear();

    other.dispatchEvent(new Event("scroll"));

    expect(gbcr).not.toHaveBeenCalled();
  });

  it("re-measures when a scroller outside its shadow root scrolls", () => {
    const scroller = document.createElement("div");
    const host = document.createElement("div");
    scroller.appendChild(host);
    document.body.appendChild(scroller);
    const el = document.createElement("div");
    host.attachShadow({ mode: "open" }).appendChild(el);
    const gbcr = vi.spyOn(el, "getBoundingClientRect").mockReturnValue(box(0, 200));
    const seen = watch(make(el));

    gbcr.mockReturnValue(box(0, 40));
    scroller.dispatchEvent(new Event("scroll"));

    expect(seen.y).toBe(40);
  });

  it("notifies per field: a reader of the width alone ignores a scroll", () => {
    const { el, gbcr } = element(box(0, 100));
    const rect = make(el);
    let runs = 0;
    live.push(
      effect(() => {
        rect.width();
        runs++;
      }),
    );

    gbcr.mockReturnValue(box(0, 40));
    document.body.dispatchEvent(new Event("scroll"));

    expect(runs).toBe(1);
  });

  it("follows a reactive target, measuring the new one", () => {
    const a = element(box(1, 2, 3, 4)).el;
    const b = element(box(10, 20, 30, 40)).el;
    const target = signal<Element>(a);
    const seen = watch(make(target));
    expect(seen).toEqual({ x: 1, y: 2, width: 3, height: 4 });

    target(b);

    expect(seen).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it("disconnects the previous observer when the target changes", () => {
    const ro = fakeObserver();
    const target = signal<Element>(document.createElement("div"));
    watch(make(target));
    expect(ro.created).toBe(1);

    target(document.createElement("div"));

    expect(ro.created).toBe(2);
    expect(ro.disconnects).toEqual([0]);
  });

  it("is a reactive source to resolve(), field by field", () => {
    const rect = make(document.createElement("div"));
    expect(isReactive(rect.x)).toBe(true);
    expect(isReactive(rect.height)).toBe(true);
  });
});

describe("createElementRect: tracks only while read", () => {
  it("starts no observer or listener until something reactive reads it", () => {
    const ro = fakeObserver();
    const add = vi.spyOn(window, "addEventListener");

    make(document.createElement("div"));

    expect(ro.created).toBe(0);
    expect(add).not.toHaveBeenCalledWith("scroll", expect.anything(), expect.anything());
  });

  it("stops measuring once its last reader is gone", () => {
    const ro = fakeObserver();
    const { el, gbcr } = element(box(0, 10));
    const rect = make(el);

    effect(() => void rect.y())();
    gbcr.mockClear();
    document.body.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));

    expect(gbcr).not.toHaveBeenCalled();
    expect(ro.disconnects).toEqual([0]);
  });

  it("measures fresh when a reader returns", () => {
    const { el, gbcr } = element(box(0, 10));
    const rect = make(el);
    effect(() => void rect.y())();

    // Moved while nobody read it: no event reached it.
    gbcr.mockReturnValue(box(0, 70));

    expect(watch(rect).y).toBe(70);
  });

  it("measures on the spot when read outside any effect", () => {
    const { el, gbcr } = element(box(0, 10));
    const rect = make(el);

    expect(rect.y()).toBe(10);
    gbcr.mockReturnValue(box(0, 30));
    expect(rect.y()).toBe(30);
  });
});

describe("createElementRect: dispose", () => {
  it("disconnects the observer, even while read", () => {
    const ro = fakeObserver();
    const rect = make(document.createElement("div"));
    watch(rect);

    rect[Symbol.dispose]();

    expect(ro.disconnects).toEqual([0]);
  });

  it("stops re-measuring and keeps its last values", () => {
    const { el, gbcr } = element(box(100, 50));
    const rect = make(el);
    const seen = watch(rect);

    rect[Symbol.dispose]();
    gbcr.mockReturnValue(box(30, 50));
    window.dispatchEvent(new Event("resize"));

    expect(seen.x).toBe(100);
    expect(rect.x()).toBe(100);
  });

  it("disposes with the scope that created it", () => {
    const ro = fakeObserver();
    const stop = effectScope(() => {
      const rect = createElementRect(document.createElement("div"));
      effect(() => void rect.x());
    });

    stop();

    expect(ro.disconnects).toEqual([0]);
  });
});
