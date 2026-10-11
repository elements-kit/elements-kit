import { describe, it, expect, beforeEach } from "vitest";
import { effect, isReactive, onCleanup, signal } from "./signals";
import { For } from "./for";

// ─ Helpers ────────────────────────────────────────────────────────────────────

/** Mount a For into a real container and return that container. */
function mount<T>(
  each: T[] | (() => T[]),
  by: (item: T, i: number) => string | number,
  render: (item: T, i: number) => Element,
): HTMLDivElement {
  const container = document.createElement("div");
  const list = new For<T>();
  if (typeof each === "function")
    effect(() => {
      list.each = each();
    });
  else {
    list.each = each as T[];
  }
  list.by = by;
  list.children = render;
  container.appendChild(list.render());
  return container;
}

/** Text content of every <li> inside the container, in DOM order. */
function texts(container: Element): string[] {
  return Array.from(container.querySelectorAll("li")).map(
    (li) => li.textContent ?? "",
  );
}

/** IDs of every <li> inside the container, in DOM order. */
function ids(container: Element): string[] {
  return Array.from(container.querySelectorAll("li")).map((li) => li.id);
}

// ─ Tests ──────────────────────────────────────────────────────────────────────

describe("For", () => {
  describe("initial render", () => {
    it("renders an empty list", () => {
      const container = mount(
        () => [],
        (_, i) => i,
        (_, i) => {
          const li = document.createElement("li");
          li.textContent = String(i);
          return li;
        },
      );
      expect(texts(container)).toEqual([]);
    });

    it("renders items in order", () => {
      const items = ["a", "b", "c"];
      const container = mount(
        () => items,
        (item) => item,
        (item) => {
          const li = document.createElement("li");
          li.textContent = item;
          return li;
        },
      );
      expect(texts(container)).toEqual(["a", "b", "c"]);
    });
  });

  describe("reactive updates", () => {
    let src: ReturnType<typeof signal<{ id: string; label: string }[]>>;
    let container: HTMLDivElement;

    beforeEach(() => {
      src = signal([
        { id: "1", label: "one" },
        { id: "2", label: "two" },
        { id: "3", label: "three" },
      ]);
      container = mount(
        src,
        (item) => item.id,
        (item) => {
          const li = document.createElement("li");
          li.id = item.id;
          li.textContent = item.label;
          return li;
        },
      );
    });

    it("appends a new item at the end", () => {
      src([...src(), { id: "4", label: "four" }]);
      expect(ids(container)).toEqual(["1", "2", "3", "4"]);
    });

    it("prepends a new item at the start", () => {
      src([{ id: "0", label: "zero" }, ...src()]);
      expect(ids(container)).toEqual(["0", "1", "2", "3"]);
    });

    it("removes an item from the middle", () => {
      src(src().filter((x) => x.id !== "2"));
      expect(ids(container)).toEqual(["1", "3"]);
    });

    it("removes the first item", () => {
      src(src().slice(1));
      expect(ids(container)).toEqual(["2", "3"]);
    });

    it("removes the last item", () => {
      src(src().slice(0, -1));
      expect(ids(container)).toEqual(["1", "2"]);
    });

    it("reverses the list", () => {
      src([...src()].reverse());
      expect(ids(container)).toEqual(["3", "2", "1"]);
    });

    it("swaps two adjacent items", () => {
      const [a, b, c] = src();
      src([a, c, b]);
      expect(ids(container)).toEqual(["1", "3", "2"]);
    });

    it("replaces the entire list", () => {
      src([
        { id: "a", label: "alpha" },
        { id: "b", label: "beta" },
      ]);
      expect(ids(container)).toEqual(["a", "b"]);
    });

    it("clears the list", () => {
      src([]);
      expect(ids(container)).toEqual([]);
    });

    it("does not recreate DOM nodes for unchanged keys", () => {
      const before = container.querySelector("li#2") as HTMLLIElement;
      // mutate only around key "2"
      src([src()[0], src()[1], { id: "3b", label: "three-b" }]);
      const after = container.querySelector("li#2") as HTMLLIElement;
      expect(after).toBe(before); // same node identity
    });

    it("common prefix is not moved", () => {
      const before1 = container.querySelector("li#1") as HTMLLIElement;
      const before2 = container.querySelector("li#2") as HTMLLIElement;
      // append to the end — prefix [1,2] should be untouched
      src([...src(), { id: "4", label: "four" }]);
      expect(container.querySelector("li#1")).toBe(before1);
      expect(container.querySelector("li#2")).toBe(before2);
    });

    it("common suffix is not moved", () => {
      const before3 = container.querySelector("li#3") as HTMLLIElement;
      // prepend — suffix [3] should be untouched
      src([{ id: "0", label: "zero" }, ...src()]);
      expect(container.querySelector("li#3")).toBe(before3);
    });
  });

  describe("per-item effectScope", () => {
    it("runs onCleanup registered inside render when that item is removed", () => {
      const cleaned: string[] = [];
      const container = document.createElement("div");
      const list = new For<{ id: string }>();
      list.by = (it) => it.id;
      list.children = (it) => {
        onCleanup(() => cleaned.push(it.id));
        const li = document.createElement("li");
        li.id = it.id;
        return li;
      };
      list.each = [{ id: "a" }, { id: "b" }, { id: "c" }];
      container.appendChild(list.render());
      expect(cleaned).toEqual([]);
      list.each = [{ id: "a" }, { id: "c" }];
      expect(cleaned).toEqual(["b"]);
      list.each = [{ id: "c" }];
      expect(cleaned).toEqual(["b", "a"]);
    });
  });

  describe("index-based key (default)", () => {
    it("updates by index when no key fn is given", () => {
      const src = signal(["x", "y", "z"]);
      const container = mount(
        src,
        (_, i) => i,
        (item) => {
          const li = document.createElement("li");
          li.textContent = item;
          return li;
        },
      );
      src(["x", "y", "z", "w"]);
      expect(texts(container)).toEqual(["x", "y", "z", "w"]);
    });
  });
});
