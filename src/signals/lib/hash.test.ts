import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createHash } from "./hash.ts";

afterEach(() => {
  document.body.innerHTML = "";
  // Reset hash
  location.hash = "";
  vi.useRealTimers();
});

describe("createHash", () => {
  it("reads the current location.hash", () => {
    let h!: ReturnType<typeof createHash>;
    effectScope(() => {
      h = createHash();
    });
    // happy-dom starts with empty hash
    expect(typeof h()).toBe("string");
  });

  it("updates when hash changes via hashchange event", () => {
    let h!: ReturnType<typeof createHash>;
    effectScope(() => {
      h = createHash();
    });
    location.hash = "#section";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(h()).toBe("#section");
  });

  it("writing the signal updates location.hash", () => {
    let h!: ReturnType<typeof createHash>;
    effectScope(() => {
      h = createHash();
    });
    h("#new");
    expect(location.hash).toBe("#new");
  });

  it("removes event listener on scope disposal", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    let h!: ReturnType<typeof createHash>;
    const stop = effectScope(() => {
      h = createHash();
    });
    stop();
    expect(removeSpy).toHaveBeenCalledWith("hashchange", expect.any(Function));
  });
});
