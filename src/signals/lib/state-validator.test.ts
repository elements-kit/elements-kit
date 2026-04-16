import { afterEach, describe, expect, it } from "vitest";
import { effectScope, signal } from "../index.ts";
import { createStateValidator } from "./state-validator.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createStateValidator", () => {
  it("starts with validator result of the initial value", () => {
    const s = signal("");
    let v!: ReturnType<typeof createStateValidator<string, string>>;
    effectScope(() => {
      v = createStateValidator(
        () => s(),
        (value) => (value.length < 3 ? "Too short" : null),
      );
    });
    expect(v.errors()).toBe("Too short");
    expect(v.isValid()).toBe(false);
  });

  it("becomes valid when constraint is met", () => {
    const s = signal("");
    let v!: ReturnType<typeof createStateValidator<string, string>>;
    effectScope(() => {
      v = createStateValidator(
        () => s(),
        (value) => (value.length < 3 ? "Too short" : null),
      );
    });
    s("hello");
    expect(v.errors()).toBeNull();
    expect(v.isValid()).toBe(true);
  });

  it("re-validates when the source changes", () => {
    const s = signal(5);
    let v!: ReturnType<typeof createStateValidator<number, string>>;
    effectScope(() => {
      v = createStateValidator(
        () => s(),
        (n) => (n > 10 ? "Too big" : null),
      );
    });
    expect(v.isValid()).toBe(true);
    s(15);
    expect(v.errors()).toBe("Too big");
    expect(v.isValid()).toBe(false);
  });
});
