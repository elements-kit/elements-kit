import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createCSSVar } from "./css-var.ts";

afterEach(() => {
  document.documentElement.style.removeProperty("--test-color");
  document.documentElement.style.removeProperty("--accent");
});

describe("createCSSVar", () => {
  it("reads from computed style when no initial value", () => {
    document.documentElement.style.setProperty("--test-color", "red");
    let v!: ReturnType<typeof createCSSVar>;
    effectScope(() => {
      v = createCSSVar("--test-color");
    });
    expect(v()).toBe("red");
  });

  it("uses initialValue when provided", () => {
    let v!: ReturnType<typeof createCSSVar>;
    effectScope(() => {
      v = createCSSVar("--accent", "blue");
    });
    expect(v()).toBe("blue");
  });

  it("writing updates the CSS property", () => {
    let v!: ReturnType<typeof createCSSVar>;
    effectScope(() => {
      v = createCSSVar("--accent", "blue");
    });
    v("green");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(
      "green",
    );
  });

  it("applies to a custom target element", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let v!: ReturnType<typeof createCSSVar>;
    effectScope(() => {
      v = createCSSVar("--test-color", "pink", el);
    });
    expect(v()).toBe("pink");
    expect(el.style.getPropertyValue("--test-color")).toBe("pink");
    document.body.removeChild(el);
  });
});
