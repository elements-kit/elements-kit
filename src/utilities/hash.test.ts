import { afterEach, describe, expect, it, vi } from "vitest";
import { hash } from "@/utilities/hash";

afterEach(() => {
  document.body.innerHTML = "";
  // Reset hash
  location.hash = "";
  vi.useRealTimers();
});

describe("hash (singleton)", () => {
  it("reads the current location.hash", () => {
    expect(hash()).toBe(location.hash);
  });

  it("updates when hash changes via hashchange event", () => {
    location.hash = "#foo";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(hash()).toBe("#foo");
  });

  it("remains reactive after scope disposal", () => {
    location.hash = "#gone";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(hash()).toBe("#gone");
  });
});
