import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createList } from "./list.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createList", () => {
  it("starts empty by default", () => {
    let l!: ReturnType<typeof createList<number>>;
    effectScope(() => {
      l = createList<number>();
    });
    expect(l.items()).toEqual([]);
    expect(l.size()).toBe(0);
  });

  it("starts with initial items", () => {
    let l!: ReturnType<typeof createList<number>>;
    effectScope(() => {
      l = createList([1, 2, 3]);
    });
    expect(l.items()).toEqual([1, 2, 3]);
  });

  it("push adds items", () => {
    let l!: ReturnType<typeof createList<number>>;
    effectScope(() => {
      l = createList<number>();
    });
    l.push(1, 2);
    expect(l.items()).toEqual([1, 2]);
  });

  it("pop removes and returns the last item", () => {
    let l!: ReturnType<typeof createList<number>>;
    effectScope(() => {
      l = createList([1, 2, 3]);
    });
    const last = l.pop();
    expect(last).toBe(3);
    expect(l.items()).toEqual([1, 2]);
  });

  it("remove removes by index", () => {
    let l!: ReturnType<typeof createList<number>>;
    effectScope(() => {
      l = createList([1, 2, 3]);
    });
    l.remove(1);
    expect(l.items()).toEqual([1, 3]);
  });

  it("filter keeps matching items", () => {
    let l!: ReturnType<typeof createList<number>>;
    effectScope(() => {
      l = createList([1, 2, 3, 4]);
    });
    l.filter((n) => n % 2 === 0);
    expect(l.items()).toEqual([2, 4]);
  });

  it("set replaces all items", () => {
    let l!: ReturnType<typeof createList<number>>;
    effectScope(() => {
      l = createList([1, 2, 3]);
    });
    l.set([10, 20]);
    expect(l.items()).toEqual([10, 20]);
  });

  it("clear empties the list", () => {
    let l!: ReturnType<typeof createList<number>>;
    effectScope(() => {
      l = createList([1, 2, 3]);
    });
    l.clear();
    expect(l.items()).toEqual([]);
    expect(l.size()).toBe(0);
  });
});
