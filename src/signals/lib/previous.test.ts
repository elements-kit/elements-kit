import { describe, it, expect } from "vitest";
import { effectScope, signal } from "../index.ts";
import { createPrevious } from "./previous.ts";

describe("createPrevious", () => {
  it("starts as undefined", () => {
    const s = signal(1);
    let p!: ReturnType<typeof createPrevious<number>>;
    effectScope(() => {
      p = createPrevious(() => s());
    });
    expect(p()).toBeUndefined();
  });

  it("returns the previous value after a change", () => {
    const s = signal(1);
    let p!: ReturnType<typeof createPrevious<number>>;
    effectScope(() => {
      p = createPrevious(() => s());
    });

    s(2);
    expect(p()).toBe(1);
  });

  it("tracks each successive previous value", () => {
    const s = signal("a");
    let p!: ReturnType<typeof createPrevious<string>>;
    effectScope(() => {
      p = createPrevious(() => s());
    });

    s("b");
    expect(p()).toBe("a");

    s("c");
    expect(p()).toBe("b");
  });

  it("does not update after scope disposal", () => {
    const s = signal(10);
    let p!: ReturnType<typeof createPrevious<number>>;
    const stop = effectScope(() => {
      p = createPrevious(() => s());
    });

    s(20);
    stop();
    s(30);
    expect(p()).toBe(10); // frozen at the value before disposal
  });
});
