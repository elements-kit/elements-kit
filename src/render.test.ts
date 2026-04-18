import { describe, it, expect } from "vitest";
import { effect, onCleanup, signal } from "./signals";
import { render } from "./render";

describe("render", () => {
  it("appends the node and unmount removes + disposes the scope", () => {
    const target = document.createElement("div");
    const log: string[] = [];
    const count = signal(0);

    const unmount = render(target, () => {
      effect(() => log.push(`count:${count()}`));
      onCleanup(() => log.push("cleanup"));
      const el = document.createElement("span");
      el.textContent = "hi";
      return el;
    });

    expect(target.children.length).toBe(1);
    expect(target.firstElementChild?.textContent).toBe("hi");
    expect(log).toEqual(["count:0"]);

    count(1);
    expect(log).toEqual(["count:0", "count:1"]);

    unmount();
    expect(target.children.length).toBe(0);
    expect(log).toEqual(["count:0", "count:1", "cleanup"]);

    // effects stop after unmount
    count(2);
    expect(log).toEqual(["count:0", "count:1", "cleanup"]);
  });

  it("handles setup returning null (no append, scope still managed)", () => {
    const target = document.createElement("div");
    const log: string[] = [];
    const count = signal(0);

    const unmount = render(target, () => {
      effect(() => log.push(`count:${count()}`));
      return null;
    });

    expect(target.children.length).toBe(0);
    expect(log).toEqual(["count:0"]);
    count(1);
    expect(log).toEqual(["count:0", "count:1"]);

    unmount();
    count(2);
    expect(log).toEqual(["count:0", "count:1"]);
  });
});
