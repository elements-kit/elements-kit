import { describe, it, expect } from "vitest";
import { createMemo } from "./memo.ts";

describe("createMemo", () => {
  it("memoises function results", () => {
    let callCount = 0;
    const { call } = createMemo((a: number, b: number) => {
      callCount++;
      return a + b;
    });

    expect(call(1, 2)).toBe(3);
    expect(call(1, 2)).toBe(3);
    expect(callCount).toBe(1); // only computed once

    expect(call(3, 4)).toBe(7);
    expect(callCount).toBe(2);
  });

  it("exposes reactive result", () => {
    const { call, result } = createMemo((x: number) => x * 2);

    expect(result()).toBeUndefined();
    call(5);
    expect(result()).toBe(10);
  });

  it("clears the cache", () => {
    let callCount = 0;
    const { call, clear } = createMemo((x: number) => {
      callCount++;
      return x;
    });

    call(1);
    expect(callCount).toBe(1);

    clear();
    call(1);
    expect(callCount).toBe(2); // recomputed after clear
  });

  it("accepts a custom key function", () => {
    let callCount = 0;
    const { call } = createMemo(
      (obj: { id: number }) => {
        callCount++;
        return obj.id;
      },
      (obj) => String(obj.id),
    );

    call({ id: 1 });
    call({ id: 1 }); // same key even though different object
    expect(callCount).toBe(1);
  });
});
