import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createColorScheme } from "./color-scheme.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createColorScheme", () => {
  it("returns 'light' by default when no dark preference", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    let scheme!: ReturnType<typeof createColorScheme>;
    effectScope(() => {
      scheme = createColorScheme();
    });

    expect(scheme()).toBe("light");
  });

  it("returns 'dark' when prefers-color-scheme: dark matches", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    let scheme!: ReturnType<typeof createColorScheme>;
    effectScope(() => {
      scheme = createColorScheme();
    });

    expect(scheme()).toBe("dark");
  });
});
