import { afterEach, describe, expect, it } from "vitest";
import { online } from "./network.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

import { vi } from "vitest";

describe("online", () => {
  it("reflects navigator.onLine", () => {
    expect(online()).toBe(navigator.onLine);
  });

  it("becomes false on offline event", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
    expect(online()).toBe(false);
  });

  it("becomes true on online event", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    window.dispatchEvent(new Event("online"));
    expect(online()).toBe(true);
  });
});
