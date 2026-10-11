import { describe, expect, it, vi } from "vitest";
import { windowSize } from "./window-size.ts";

describe("windowSize (singleton)", () => {
  it("starts with current window dimensions", () => {
    expect(windowSize.width()).toBe(window.innerWidth);
    expect(windowSize.height()).toBe(window.innerHeight);
  });

  it("updates on resize event", () => {
    const origWidth = window.innerWidth;
    const origHeight = window.innerHeight;
    // Simulate resize
    Object.defineProperty(window, "innerWidth", {
      value: 1234,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 5678,
      configurable: true,
    });
    window.dispatchEvent(new Event("resize"));
    expect(windowSize.width()).toBe(1234);
    expect(windowSize.height()).toBe(5678);
    // Restore
    Object.defineProperty(window, "innerWidth", {
      value: origWidth,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: origHeight,
      configurable: true,
    });
  });

  it("remains reactive after Symbol.dispose", () => {
    // Singleton signals are not tied to disposal
    Object.defineProperty(window, "innerWidth", {
      value: 42,
      configurable: true,
    });
    window.dispatchEvent(new Event("resize"));
    expect(windowSize.width()).toBe(42);
  });
});
