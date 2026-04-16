import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createElementVisibility } from "./element-visibility.ts";

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
    fire: (ratio: number) => {
      observerCallback(
        [{ intersectionRatio: ratio } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    },
    disconnect,
  };
}

describe("createElementVisibility", () => {
  it("starts at 0", () => {
    mockIntersectionObserver();
    const el = document.createElement("div");

    let ratio!: ReturnType<typeof createElementVisibility>;
    effectScope(() => {
      ratio = createElementVisibility(el);
    });

    expect(ratio()).toBe(0);
  });

  it("updates ratio when intersection fires", () => {
    const { fire } = mockIntersectionObserver();
    const el = document.createElement("div");

    let ratio!: ReturnType<typeof createElementVisibility>;
    effectScope(() => {
      ratio = createElementVisibility(el);
    });

    fire(0.5);
    expect(ratio()).toBe(0.5);

    fire(1);
    expect(ratio()).toBe(1);
  });
});
