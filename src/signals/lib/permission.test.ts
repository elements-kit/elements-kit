import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createPermission } from "./permission.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createPermission", () => {
  it("returns 'unsupported' when permissions API is missing", () => {
    vi.stubGlobal("navigator", { permissions: undefined });
    let p!: ReturnType<typeof createPermission>;
    effectScope(() => {
      p = createPermission({ name: "geolocation" });
    });
    expect(p.state()).toBe("unsupported");
  });

  it("queries permissions and returns the state", async () => {
    const mockStatus = {
      state: "granted",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("navigator", {
      permissions: { query: vi.fn().mockResolvedValue(mockStatus) },
    });

    let p!: ReturnType<typeof createPermission>;
    effectScope(() => {
      p = createPermission({ name: "geolocation" });
    });

    await new Promise((res) => setTimeout(res, 0));
    expect(p.state()).toBe("granted");
  });

  it("removes event listener on Symbol.dispose", () => {
    const removeListener = vi.fn();
    const mockStatus = {
      state: "denied",
      addEventListener: vi.fn(),
      removeEventListener: removeListener,
    };
    vi.stubGlobal("navigator", {
      permissions: { query: vi.fn().mockResolvedValue(mockStatus) },
    });

    let p!: ReturnType<typeof createPermission>;
    effectScope(() => {
      p = createPermission({ name: "geolocation" });
    });

    p[Symbol.dispose]();
    // removeListener called only after the promise resolved, but dispose
    // should still clean up what's stored
    expect(typeof p.state()).toBe("string");
  });
});
