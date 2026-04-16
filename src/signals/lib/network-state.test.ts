import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createNetworkState } from "./network-state.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("createNetworkState", () => {
  it("reads navigator.onLine initially", () => {
    let n!: ReturnType<typeof createNetworkState>;
    effectScope(() => {
      n = createNetworkState();
    });
    // happy-dom reports navigator.onLine as true
    expect(n.online()).toBe(navigator.onLine);
  });

  it("becomes false on offline event", () => {
    let n!: ReturnType<typeof createNetworkState>;
    effectScope(() => {
      n = createNetworkState();
    });
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    window.dispatchEvent(new Event("offline"));
    expect(n.online()).toBe(false);
  });

  it("becomes true on online event", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    let n!: ReturnType<typeof createNetworkState>;
    effectScope(() => {
      n = createNetworkState();
    });

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    window.dispatchEvent(new Event("online"));
    expect(n.online()).toBe(true);
  });

  it("stops reacting after Symbol.dispose", () => {
    let n!: ReturnType<typeof createNetworkState>;
    effectScope(() => {
      n = createNetworkState();
    });
    const initial = n.online();
    n[Symbol.dispose]();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => !initial,
    });
    window.dispatchEvent(new Event("offline"));
    // Signal should not change
    expect(n.online()).toBe(initial);
  });
});
