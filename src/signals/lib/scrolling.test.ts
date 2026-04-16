import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createScrolling } from "./scrolling.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createScrolling", () => {
  it("starts as false", () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    document.body.appendChild(el);

    let scrolling!: ReturnType<typeof createScrolling>;
    effectScope(() => {
      scrolling = createScrolling(el);
    });
    expect(scrolling()).toBe(false);
  });

  it("becomes true on scroll event", () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    document.body.appendChild(el);

    let scrolling!: ReturnType<typeof createScrolling>;
    effectScope(() => {
      scrolling = createScrolling(el);
    });
    el.dispatchEvent(new Event("scroll"));
    expect(scrolling()).toBe(true);
  });

  it("returns to false after delay", () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    document.body.appendChild(el);

    let scrolling!: ReturnType<typeof createScrolling>;
    effectScope(() => {
      scrolling = createScrolling(el, 150);
    });
    el.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(200);
    expect(scrolling()).toBe(false);
  });

  it("stops reacting after Symbol.dispose", () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    document.body.appendChild(el);

    let scrolling!: ReturnType<typeof createScrolling>;
    effectScope(() => {
      scrolling = createScrolling(el);
    });
    scrolling[Symbol.dispose]();
    el.dispatchEvent(new Event("scroll"));
    expect(scrolling()).toBe(false);
  });
});
