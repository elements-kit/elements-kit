import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createQueue } from "./queue.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createQueue", () => {
  it("starts empty by default", () => {
    let q!: ReturnType<typeof createQueue<number>>;
    effectScope(() => {
      q = createQueue<number>();
    });
    expect(q.items()).toEqual([]);
    expect(q.size()).toBe(0);
  });

  it("add enqueues an item", () => {
    let q!: ReturnType<typeof createQueue<number>>;
    effectScope(() => {
      q = createQueue<number>();
    });
    q.add(1);
    q.add(2);
    expect(q.items()).toEqual([1, 2]);
  });

  it("remove dequeues the first item (FIFO)", () => {
    let q!: ReturnType<typeof createQueue<number>>;
    effectScope(() => {
      q = createQueue([1, 2, 3]);
    });
    const first = q.remove();
    expect(first).toBe(1);
    expect(q.items()).toEqual([2, 3]);
  });

  it("peek returns the front without removing", () => {
    let q!: ReturnType<typeof createQueue<number>>;
    effectScope(() => {
      q = createQueue([10, 20]);
    });
    expect(q.peek()).toBe(10);
    expect(q.size()).toBe(2);
  });

  it("clear empties the queue", () => {
    let q!: ReturnType<typeof createQueue<number>>;
    effectScope(() => {
      q = createQueue([1, 2, 3]);
    });
    q.clear();
    expect(q.items()).toEqual([]);
    expect(q.size()).toBe(0);
  });
});
