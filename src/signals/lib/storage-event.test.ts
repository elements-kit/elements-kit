import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createStorageEvent } from "./storage-event.ts";

afterEach(() => {
  localStorage.clear();
});

describe("createStorageEvent", () => {
  it("reads initial value from storage", () => {
    localStorage.setItem("test-key", JSON.stringify("stored"));
    let s!: ReturnType<typeof createStorageEvent<string>>;
    effectScope(() => {
      s = createStorageEvent("test-key", "default");
    });
    expect(s()).toBe("stored");
  });

  it("falls back to initialValue when key is missing", () => {
    let s!: ReturnType<typeof createStorageEvent<number>>;
    effectScope(() => {
      s = createStorageEvent("missing", 99);
    });
    expect(s()).toBe(99);
  });

  it("writing updates localStorage", () => {
    let s!: ReturnType<typeof createStorageEvent<string>>;
    effectScope(() => {
      s = createStorageEvent("key", "a");
    });
    s("b");
    expect(JSON.parse(localStorage.getItem("key")!)).toBe("b");
  });

  it("reacts to storage events from other tabs", () => {
    let s!: ReturnType<typeof createStorageEvent<string>>;
    effectScope(() => {
      s = createStorageEvent("sync-key", "init");
    });
    // Simulate cross-tab storage event
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
    let s!: ReturnType<typeof createStorageEvent<string>>;
    effectScope(() => {
      s = createStorageEvent("my-key", "init");
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
    let s!: ReturnType<typeof createStorageEvent<string>>;
    effectScope(() => {
      s = createStorageEvent("rm-key", "default");
    });
    s("changed");
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
