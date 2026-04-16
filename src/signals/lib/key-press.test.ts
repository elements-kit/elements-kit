import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createKeyPress } from "./key-press.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createKeyPress", () => {
  it("starts as false", () => {
    let k!: ReturnType<typeof createKeyPress>;
    effectScope(() => {
      k = createKeyPress("a");
    });
    expect(k.pressed()).toBe(false);
  });

  it("becomes true on keydown", () => {
    let k!: ReturnType<typeof createKeyPress>;
    effectScope(() => {
      k = createKeyPress("a");
    });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(k.pressed()).toBe(true);
  });

  it("becomes false on keyup", () => {
    let k!: ReturnType<typeof createKeyPress>;
    effectScope(() => {
      k = createKeyPress("a");
    });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "a" }));
    expect(k.pressed()).toBe(false);
  });

  it("does not react to different keys", () => {
    let k!: ReturnType<typeof createKeyPress>;
    effectScope(() => {
      k = createKeyPress("a");
    });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    expect(k.pressed()).toBe(false);
  });

  it("stops reacting after Symbol.dispose", () => {
    let k!: ReturnType<typeof createKeyPress>;
    effectScope(() => {
      k = createKeyPress("a");
    });
    k[Symbol.dispose]();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(k.pressed()).toBe(false);
  });
});
