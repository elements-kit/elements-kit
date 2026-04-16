import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createCounter } from "./counter.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createCounter", () => {
  it("starts at 0 by default", () => {
    let c!: ReturnType<typeof createCounter>;
    effectScope(() => {
      c = createCounter();
    });
    expect(c()).toBe(0);
  });

  it("starts at a provided initial value", () => {
    let c!: ReturnType<typeof createCounter>;
    effectScope(() => {
      c = createCounter(10);
    });
    expect(c()).toBe(10);
  });

  it("increments by 1", () => {
    let c!: ReturnType<typeof createCounter>;
    effectScope(() => {
      c = createCounter(0);
    });
    c.increment();
    expect(c()).toBe(1);
  });

  it("increments by step", () => {
    let c!: ReturnType<typeof createCounter>;
    effectScope(() => {
      c = createCounter(0);
    });
    c.increment(5);
    expect(c()).toBe(5);
  });

  it("decrements by 1", () => {
    let c!: ReturnType<typeof createCounter>;
    effectScope(() => {
      c = createCounter(5);
    });
    c.decrement();
    expect(c()).toBe(4);
  });

  it("resets to initial value", () => {
    let c!: ReturnType<typeof createCounter>;
    effectScope(() => {
      c = createCounter(3);
    });
    c.increment(10);
    c.reset();
    expect(c()).toBe(3);
  });

  it("clamps to max", () => {
    let c!: ReturnType<typeof createCounter>;
    effectScope(() => {
      c = createCounter(0, { max: 5 });
    });
    c.increment(100);
    expect(c()).toBe(5);
  });

  it("clamps to min", () => {
    let c!: ReturnType<typeof createCounter>;
    effectScope(() => {
      c = createCounter(0, { min: -3 });
    });
    c.decrement(100);
    expect(c()).toBe(-3);
  });
});
