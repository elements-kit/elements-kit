import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createIsInViewport } from "./is-in-viewport.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockIntersectionObserver() {
  let observerCallback!: IntersectionObserverCallback;
  const observe = vi.fn();
  const disconnect = vi.fn();
  const unobserve = vi.fn();

  vi.stubGlobal(
    "IntersectionObserver",
    function MockIO(cb: IntersectionObserverCallback) {
      observerCallback = cb;
      return {
        observe,
        disconnect,
        unobserve,
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

describe("createIsInViewport", () => {
  it("starts as false", () => {
    const { fire: _fire } = mockIntersectionObserver();
    const el = document.createElement("div");

    let visible!: ReturnType<typeof createIsInViewport>;
    effectScope(() => {
      visible = createIsInViewport(el);
    });

    expect(visible()).toBe(false);
  });

  it("becomes true when intersection fires with isIntersecting=true", () => {
    const { fire } = mockIntersectionObserver();
    const el = document.createElement("div");

    let visible!: ReturnType<typeof createIsInViewport>;
    effectScope(() => {
      visible = createIsInViewport(el);
    });

    fire(true);
    expect(visible()).toBe(true);
  });

  it("becomes false when intersection fires with isIntersecting=false", () => {
    const { fire } = mockIntersectionObserver();
    const el = document.createElement("div");

    let visible!: ReturnType<typeof createIsInViewport>;
    effectScope(() => {
      visible = createIsInViewport(el);
    });

    fire(true);
    fire(false);
    expect(visible()).toBe(false);
  });

  it("disconnects on Symbol.dispose", () => {
    const { disconnect } = mockIntersectionObserver();
    const el = document.createElement("div");

    let visible!: ReturnType<typeof createIsInViewport>;
    effectScope(() => {
      visible = createIsInViewport(el);
    });

    visible[Symbol.dispose]();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
