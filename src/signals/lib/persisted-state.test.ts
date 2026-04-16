import { describe, it, expect, beforeEach } from "vitest";
import { effectScope } from "../index.ts";
import { createPersistedState } from "./persisted-state.ts";

// Minimal in-memory Storage implementation
function makeStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i) => Object.keys(store)[i] ?? null,
  };
}

describe("createPersistedState", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = makeStorage();
  });

  it("uses initialValue when storage is empty", () => {
    let s!: ReturnType<typeof createPersistedState<number>>;
    effectScope(() => {
      s = createPersistedState("count", 0, storage);
    });
    expect(s()).toBe(0);
  });

  it("reads an existing value from storage", () => {
    storage.setItem("count", "42");
    let s!: ReturnType<typeof createPersistedState<number>>;
    effectScope(() => {
      s = createPersistedState("count", 0, storage);
    });
    expect(s()).toBe(42);
  });

  it("persists changes to storage", () => {
    let s!: ReturnType<typeof createPersistedState<number>>;
    effectScope(() => {
      s = createPersistedState("count", 0, storage);
    });

    s(5);
    expect(storage.getItem("count")).toBe("5");
  });

  it("persists complex values as JSON", () => {
    let s!: ReturnType<typeof createPersistedState<{ x: number }>>;
    effectScope(() => {
      s = createPersistedState("obj", { x: 1 }, storage);
    });

    s({ x: 99 });
    expect(JSON.parse(storage.getItem("obj")!)).toEqual({ x: 99 });
  });

  it("falls back to initialValue on invalid JSON", () => {
    storage.setItem("broken", "{not json}");
    let s!: ReturnType<typeof createPersistedState<number>>;
    effectScope(() => {
      s = createPersistedState("broken", 7, storage);
    });
    expect(s()).toBe(7);
  });
});
