import { describe, it, expect, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createLocalStorage, createSessionStorage } from "./storage.ts";

describe("createLocalStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("uses initialValue when storage is empty", () => {
    let s!: ReturnType<typeof createLocalStorage<number>>;
    effectScope(() => {
      s = createLocalStorage("count", 0);
    });
    expect(s()).toBe(0);
  });

  it("reads an existing value from localStorage", () => {
    localStorage.setItem("count", "42");
    let s!: ReturnType<typeof createLocalStorage<number>>;
    effectScope(() => {
      s = createLocalStorage("count", 0);
    });
    expect(s()).toBe(42);
  });

  it("persists writes to localStorage", () => {
    let s!: ReturnType<typeof createLocalStorage<string>>;
    effectScope(() => {
      s = createLocalStorage("key", "a");
    });
    s("b");
    expect(JSON.parse(localStorage.getItem("key")!)).toBe("b");
  });

  it("persists complex values as JSON", () => {
    let s!: ReturnType<typeof createLocalStorage<{ x: number }>>;
    effectScope(() => {
      s = createLocalStorage("obj", { x: 1 });
    });
    s({ x: 99 });
    expect(JSON.parse(localStorage.getItem("obj")!)).toEqual({ x: 99 });
  });

  it("falls back to initialValue on invalid JSON", () => {
    localStorage.setItem("broken", "{not json}");
    let s!: ReturnType<typeof createLocalStorage<number>>;
    effectScope(() => {
      s = createLocalStorage("broken", 7);
    });
    expect(s()).toBe(7);
  });

  it("supports custom serialise / deserialise", () => {
    let s!: ReturnType<typeof createLocalStorage<Date>>;
    effectScope(() => {
      s = createLocalStorage("date", new Date("2024-01-01"), {
        serialise: (d) => d.toISOString(),
        deserialise: (raw) => new Date(raw),
      });
    });
    const d = new Date("2025-06-15");
    s(d);
    expect(localStorage.getItem("date")).toBe(d.toISOString());
  });

  it("reacts to storage events from other tabs", () => {
    let s!: ReturnType<typeof createLocalStorage<string>>;
    effectScope(() => {
      s = createLocalStorage("sync-key", "init");
    });
    // In a real browser the other tab's write updates localStorage first.
    localStorage.setItem("sync-key", JSON.stringify("from-other-tab"));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "sync-key",
        newValue: JSON.stringify("from-other-tab"),
        storageArea: localStorage,
      }),
    );
    expect(s()).toBe("from-other-tab");
  });

  it("ignores storage events for different keys", () => {
    let s!: ReturnType<typeof createLocalStorage<string>>;
    effectScope(() => {
      s = createLocalStorage("my-key", "init");
    });
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "other-key",
        newValue: JSON.stringify("nope"),
        storageArea: localStorage,
      }),
    );
    expect(s()).toBe("init");
  });

  it("resets to initialValue when key is removed", () => {
    let s!: ReturnType<typeof createLocalStorage<string>>;
    effectScope(() => {
      s = createLocalStorage("rm-key", "default");
    });
    s("changed");
    localStorage.removeItem("rm-key");
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "rm-key",
        newValue: null,
        storageArea: localStorage,
      }),
    );
    expect(s()).toBe("default");
  });
});

describe("createSessionStorage", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("uses initialValue when storage is empty", () => {
    let s!: ReturnType<typeof createSessionStorage<number>>;
    effectScope(() => {
      s = createSessionStorage("count", 0);
    });
    expect(s()).toBe(0);
  });

  it("reads an existing value from sessionStorage", () => {
    sessionStorage.setItem("count", "42");
    let s!: ReturnType<typeof createSessionStorage<number>>;
    effectScope(() => {
      s = createSessionStorage("count", 0);
    });
    expect(s()).toBe(42);
  });

  it("persists writes to sessionStorage", () => {
    let s!: ReturnType<typeof createSessionStorage<string>>;
    effectScope(() => {
      s = createSessionStorage("key", "a");
    });
    s("b");
    expect(JSON.parse(sessionStorage.getItem("key")!)).toBe("b");
  });

  it("falls back to initialValue on invalid JSON", () => {
    sessionStorage.setItem("broken", "{not json}");
    let s!: ReturnType<typeof createSessionStorage<number>>;
    effectScope(() => {
      s = createSessionStorage("broken", 7);
    });
    expect(s()).toBe(7);
  });
});
