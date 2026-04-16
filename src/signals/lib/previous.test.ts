import { describe, it, expect } from "vitest";
import { effectScope, signal } from "../index.ts";
import { createPrevious, createPreviousDistinct } from "./previous.ts";

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

describe("createPrevious with isEqual (distinct mode)", () => {
  it("starts as undefined", () => {
    const s = signal(0);
    let prev!: ReturnType<typeof createPrevious<number>>;
    effectScope(() => {
      prev = createPrevious(() => s(), Object.is);
    });
    expect(prev()).toBeUndefined();
  });

  it("updates previous when value changes", () => {
    const s = signal(0);
    let prev!: ReturnType<typeof createPrevious<number>>;
    effectScope(() => {
      prev = createPrevious(() => s(), Object.is);
    });
    s(1);
    expect(prev()).toBe(0);
  });

  it("does not update previous when value is the same", () => {
    const s = signal(0);
    let prev!: ReturnType<typeof createPrevious<number>>;
    effectScope(() => {
      prev = createPrevious(() => s(), Object.is);
    });
    s(1);
    expect(prev()).toBe(0);
    // Set to same value as current (1) — prev should stay 0
    s(1);
    expect(prev()).toBe(0);
  });

  it("uses a custom equality function", () => {
    const s = signal({ id: 1 });
    let prev!: ReturnType<typeof createPrevious<{ id: number }>>;
    effectScope(() => {
      prev = createPrevious(
        () => s(),
        (a, b) => a.id === b.id,
      );
    });
    // Same id — should NOT update prev
    s({ id: 1 });
    expect(prev()).toBeUndefined();
    // Different id — should update prev
    s({ id: 2 });
    expect(prev()?.id).toBe(1);
  });
});

describe("createPreviousDistinct (deprecated alias)", () => {
  it("is an alias for createPrevious", () => {
    expect(createPreviousDistinct).toBe(createPrevious);
  });
});
