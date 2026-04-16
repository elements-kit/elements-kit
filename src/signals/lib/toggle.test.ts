import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createToggle } from "./toggle.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createToggle", () => {
  it("starts as false by default", () => {
    let t!: ReturnType<typeof createToggle>;
    effectScope(() => {
      t = createToggle();
    });
    expect(t()).toBe(false);
  });

  it("starts with provided initial value", () => {
    let t!: ReturnType<typeof createToggle>;
    effectScope(() => {
      t = createToggle(true);
    });
    expect(t()).toBe(true);
  });

  it("toggle() flips the value", () => {
    let t!: ReturnType<typeof createToggle>;
    effectScope(() => {
      t = createToggle(false);
    });
    t.toggle();
    expect(t()).toBe(true);
    t.toggle();
    expect(t()).toBe(false);
  });

  it("can be set directly via signal call", () => {
    let t!: ReturnType<typeof createToggle>;
    effectScope(() => {
      t = createToggle();
    });
    t(true);
    expect(t()).toBe(true);
  });
});
