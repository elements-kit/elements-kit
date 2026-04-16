import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createFullscreen } from "./fullscreen.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("createFullscreen", () => {
  it("starts with current fullscreen state", () => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null,
    });

    let f!: ReturnType<typeof createFullscreen>;
    effectScope(() => {
      f = createFullscreen();
    });
    expect(f.isFullscreen()).toBe(false);
  });

  it("updates isFullscreen on fullscreenchange event", () => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null,
    });

    let f!: ReturnType<typeof createFullscreen>;
    effectScope(() => {
      f = createFullscreen();
    });

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => document.documentElement,
    });
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(f.isFullscreen()).toBe(true);
  });

  it("stops reacting after Symbol.dispose", () => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null,
    });

    let f!: ReturnType<typeof createFullscreen>;
    effectScope(() => {
      f = createFullscreen();
    });
    f[Symbol.dispose]();

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => document.documentElement,
    });
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(f.isFullscreen()).toBe(false);
  });
});
