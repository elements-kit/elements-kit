import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createPressedKeys } from "./pressed-keys.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createPressedKeys", () => {
  it("starts with an empty set", () => {
    let keys!: ReturnType<typeof createPressedKeys>;
    effectScope(() => {
      keys = createPressedKeys();
    });
    expect(keys().size).toBe(0);
  });

  it("adds a key on keydown", () => {
    let keys!: ReturnType<typeof createPressedKeys>;
    effectScope(() => {
      keys = createPressedKeys();
    });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(keys().has("a")).toBe(true);
  });

  it("removes a key on keyup", () => {
    let keys!: ReturnType<typeof createPressedKeys>;
    effectScope(() => {
      keys = createPressedKeys();
    });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "a" }));
    expect(keys().has("a")).toBe(false);
  });

  it("tracks multiple keys simultaneously", () => {
    let keys!: ReturnType<typeof createPressedKeys>;
    effectScope(() => {
      keys = createPressedKeys();
    });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Control" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(keys().has("Control")).toBe(true);
    expect(keys().has("a")).toBe(true);
  });

  it("stops reacting after Symbol.dispose", () => {
    let keys!: ReturnType<typeof createPressedKeys>;
    effectScope(() => {
      keys = createPressedKeys();
    });
    keys[Symbol.dispose]();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z" }));
    expect(keys().has("z")).toBe(false);
  });
});
