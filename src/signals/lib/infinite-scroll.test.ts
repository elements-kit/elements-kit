import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createInfiniteScroll } from "./infinite-scroll.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockIntersectionObserver() {
  let observerCallback!: IntersectionObserverCallback;
  const observe = vi.fn();
  const disconnect = vi.fn();

  vi.stubGlobal(
    "IntersectionObserver",
    function MockIO(cb: IntersectionObserverCallback) {
      observerCallback = cb;
      return {
        observe,
        disconnect,
        unobserve: vi.fn(),
        root: null,
        rootMargin: "",
        thresholds: [],
      };
    },
  );

  return {
    fire: (isIntersecting: boolean) => {
      observerCallback(
        [{ isIntersecting } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    },
    disconnect,
  };
}

describe("createInfiniteScroll", () => {
  it("calls handler when sentinel becomes visible", () => {
    const { fire } = mockIntersectionObserver();
    const sentinel = document.createElement("div");
    const handler = vi.fn();

    effectScope(() => {
      createInfiniteScroll(sentinel, handler);
    });

    fire(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not call handler when sentinel leaves viewport", () => {
    const { fire } = mockIntersectionObserver();
    const sentinel = document.createElement("div");
    const handler = vi.fn();

    effectScope(() => {
      createInfiniteScroll(sentinel, handler);
    });

    fire(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("disconnects on dispose", () => {
    const { disconnect } = mockIntersectionObserver();
    const sentinel = document.createElement("div");

    let inf!: ReturnType<typeof createInfiniteScroll>;
    effectScope(() => {
      inf = createInfiniteScroll(sentinel, vi.fn());
    });

    inf[Symbol.dispose]();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
