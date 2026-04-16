import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createShare } from "./share.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createShare", () => {
  it("reports isSupported=false when share API is missing", () => {
    vi.stubGlobal("navigator", {});

    let s!: ReturnType<typeof createShare>;
    effectScope(() => {
      s = createShare();
    });

    expect(s.isSupported).toBe(false);
  });

  it("reports isSupported=true when share API exists", () => {
    vi.stubGlobal("navigator", { share: vi.fn() });

    let s!: ReturnType<typeof createShare>;
    effectScope(() => {
      s = createShare();
    });

    expect(s.isSupported).toBe(true);
    expect(s.isSharing()).toBe(false);
  });

  it("sets isSharing during share", async () => {
    let resolveShare!: () => void;
    const shareFn = vi.fn(() => new Promise<void>((r) => (resolveShare = r)));
    vi.stubGlobal("navigator", { share: shareFn });

    let s!: ReturnType<typeof createShare>;
    effectScope(() => {
      s = createShare();
    });

    const p = s.share({ title: "test" });
    expect(s.isSharing()).toBe(true);

    resolveShare();
    await p;
    expect(s.isSharing()).toBe(false);
  });
});
