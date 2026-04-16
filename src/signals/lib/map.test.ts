import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createMap } from "./map.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createMap", () => {
  it("starts empty by default", () => {
    let m!: ReturnType<typeof createMap<string, number>>;
    effectScope(() => {
      m = createMap<string, number>();
    });
    expect(m.entries().size).toBe(0);
    expect(m.size()).toBe(0);
  });

  it("initializes from a Map", () => {
    let m!: ReturnType<typeof createMap<string, number>>;
    effectScope(() => {
      m = createMap(new Map([["a", 1]]));
    });
    expect(m.get("a")).toBe(1);
  });

  it("set adds an entry", () => {
    let m!: ReturnType<typeof createMap<string, number>>;
    effectScope(() => {
      m = createMap<string, number>();
    });
    m.set("x", 42);
    expect(m.get("x")).toBe(42);
    expect(m.size()).toBe(1);
  });

  it("delete removes an entry", () => {
    let m!: ReturnType<typeof createMap<string, number>>;
    effectScope(() => {
      m = createMap(
        new Map([
          ["a", 1],
          ["b", 2],
        ]),
      );
    });
    m.delete("a");
    expect(m.has("a")).toBe(false);
    expect(m.size()).toBe(1);
  });

  it("has returns correct boolean", () => {
    let m!: ReturnType<typeof createMap<string, number>>;
    effectScope(() => {
      m = createMap(new Map([["a", 1]]));
    });
    expect(m.has("a")).toBe(true);
    expect(m.has("z")).toBe(false);
  });

  it("clear empties the map", () => {
    let m!: ReturnType<typeof createMap<string, number>>;
    effectScope(() => {
      m = createMap(
        new Map([
          ["a", 1],
          ["b", 2],
        ]),
      );
    });
    m.clear();
    expect(m.size()).toBe(0);
  });
});
