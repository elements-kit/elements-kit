import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  Reflect.deleteProperty(window, "visualViewport");
});

/** A stand-in for the API happy-dom does not implement. */
function stubVisualViewport(size: {
  width: number;
  height: number;
  offsetLeft?: number;
  offsetTop?: number;
}) {
  const target = new EventTarget();
  const vv = Object.assign(target, {
    width: size.width,
    height: size.height,
    offsetLeft: size.offsetLeft ?? 0,
    offsetTop: size.offsetTop ?? 0,
  });
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: vv,
  });
  return vv;
}

describe("visualViewport", () => {
  it("reads the API where it exists", async () => {
    stubVisualViewport({ width: 390, height: 500, offsetTop: 12 });
    const { visualViewport } = await import("./visual-viewport.ts");

    expect(visualViewport.width()).toBe(390);
    expect(visualViewport.height()).toBe(500);
    expect(visualViewport.offsetTop()).toBe(12);
    expect(visualViewport.offsetLeft()).toBe(0);
  });

  it("follows resize, scroll and scrollend", async () => {
    const vv = stubVisualViewport({ width: 390, height: 800 });
    // `resetModules` re-instantiates the signals runtime along with the module
    // under test, so the effect has to come from that same fresh graph — a
    // statically imported one subscribes to a runtime nothing here writes to.
    const { visualViewport } = await import("./visual-viewport.ts");
    const { effect, effectScope } = await import("@/signals/index.ts");

    const seen: number[] = [];
    effectScope(() => {
      effect(() => seen.push(visualViewport.height()));
    });

    // The keyboard: a resize with no scroll.
    vv.height = 460;
    vv.dispatchEvent(new Event("resize"));
    expect(seen.at(-1)).toBe(460);

    // Sliding inside the layout viewport: a scroll with no resize.
    vv.offsetTop = 40;
    vv.dispatchEvent(new Event("scroll"));
    expect(visualViewport.offsetTop()).toBe(40);

    // Overscroll walks the offset back on settle.
    vv.offsetTop = 0;
    vv.dispatchEvent(new Event("scrollend"));
    expect(visualViewport.offsetTop()).toBe(0);
  });

  it("falls back to the window where the API is missing", async () => {
    expect(window.visualViewport).toBeUndefined();
    const { visualViewport } = await import("./visual-viewport.ts");

    expect(visualViewport.width()).toBe(window.innerWidth);
    expect(visualViewport.height()).toBe(window.innerHeight);
    expect(visualViewport.offsetTop()).toBe(0);
    expect(visualViewport.offsetLeft()).toBe(0);
  });
});
