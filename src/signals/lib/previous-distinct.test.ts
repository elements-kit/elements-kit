import { afterEach, describe, expect, it } from "vitest";
import { effectScope, signal } from "../index.ts";
import { createPreviousDistinct } from "./previous-distinct.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createPreviousDistinct", () => {
  it("starts as undefined", () => {
    const s = signal(0);
    let prev!: ReturnType<typeof createPreviousDistinct<number>>;
    effectScope(() => {
      prev = createPreviousDistinct(() => s());
    });
    expect(prev()).toBeUndefined();
  });

  it("updates previous when value changes", () => {
    const s = signal(0);
    let prev!: ReturnType<typeof createPreviousDistinct<number>>;
    effectScope(() => {
      prev = createPreviousDistinct(() => s());
    });
    s(1);
    expect(prev()).toBe(0);
  });

  it("does not update previous when value is the same", () => {
    const s = signal(0);
    let prev!: ReturnType<typeof createPreviousDistinct<number>>;
    effectScope(() => {
      prev = createPreviousDistinct(() => s());
    });
    s(1);
    expect(prev()).toBe(0);
    // Set to same value as current (1) — prev should stay 0
    s(1);
    expect(prev()).toBe(0);
  });

  it("uses a custom equality function", () => {
    const s = signal({ id: 1 });
    let prev!: ReturnType<typeof createPreviousDistinct<{ id: number }>>;
    effectScope(() => {
      prev = createPreviousDistinct(
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
