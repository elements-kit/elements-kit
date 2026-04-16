import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createPreferredLanguages } from "./preferred-languages.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createPreferredLanguages", () => {
  it("returns navigator.languages", () => {
    let langs!: ReturnType<typeof createPreferredLanguages>;
    effectScope(() => {
      langs = createPreferredLanguages();
    });

    expect(langs()).toEqual(navigator.languages);
  });

  it("updates on languagechange event", () => {
    let langs!: ReturnType<typeof createPreferredLanguages>;
    effectScope(() => {
      langs = createPreferredLanguages();
    });

    Object.defineProperty(navigator, "languages", {
      value: ["fr", "en"],
      configurable: true,
    });
    window.dispatchEvent(new Event("languagechange"));

    expect(langs()).toEqual(["fr", "en"]);
  });
});
