import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createWindowSize } from "./window-size.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createWindowSize", () => {
  it("starts with current window dimensions", () => {
    let ws!: ReturnType<typeof createWindowSize>;
    effectScope(() => {
      ws = createWindowSize();
    });
    expect(ws.width()).toBe(window.innerWidth);
    expect(ws.height()).toBe(window.innerHeight);
  });

  it("updates on resize event", () => {
    let ws!: ReturnType<typeof createWindowSize>;
    effectScope(() => {
      ws = createWindowSize();
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      get: () => 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      get: () => 768,
    });
    window.dispatchEvent(new Event("resize"));
    expect(ws.width()).toBe(1024);
    expect(ws.height()).toBe(768);
  });

  it("stops reacting after Symbol.dispose", () => {
    let ws!: ReturnType<typeof createWindowSize>;
    effectScope(() => {
      ws = createWindowSize();
    });
    const w0 = ws.width();
    ws[Symbol.dispose]();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      get: () => 9999,
    });
    window.dispatchEvent(new Event("resize"));
    expect(ws.width()).toBe(w0);
  });
});
