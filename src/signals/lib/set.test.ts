import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createSet } from "./set.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createSet", () => {
  it("starts empty by default", () => {
    let s!: ReturnType<typeof createSet<number>>;
    effectScope(() => {
      s = createSet<number>();
    });
    expect(s.entries().size).toBe(0);
    expect(s.size()).toBe(0);
  });

  it("initializes from a Set", () => {
    let s!: ReturnType<typeof createSet<number>>;
    effectScope(() => {
      s = createSet(new Set([1, 2, 3]));
    });
    expect(s.has(2)).toBe(true);
    expect(s.size()).toBe(3);
  });

  it("add inserts a value", () => {
    let s!: ReturnType<typeof createSet<number>>;
    effectScope(() => {
      s = createSet<number>();
    });
    s.add(5);
    expect(s.has(5)).toBe(true);
  });

  it("remove deletes a value", () => {
    let s!: ReturnType<typeof createSet<number>>;
    effectScope(() => {
      s = createSet(new Set([1, 2]));
    });
    s.remove(1);
    expect(s.has(1)).toBe(false);
    expect(s.size()).toBe(1);
  });

  it("toggle adds if absent, removes if present", () => {
    let s!: ReturnType<typeof createSet<number>>;
    effectScope(() => {
      s = createSet<number>();
    });
    s.toggle(7);
    expect(s.has(7)).toBe(true);
    s.toggle(7);
    expect(s.has(7)).toBe(false);
  });

  it("clear empties the set", () => {
    let s!: ReturnType<typeof createSet<number>>;
    effectScope(() => {
      s = createSet(new Set([1, 2, 3]));
    });
    s.clear();
    expect(s.size()).toBe(0);
  });
});
