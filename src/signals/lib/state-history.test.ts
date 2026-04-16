import { afterEach, describe, expect, it } from "vitest";
import { effectScope, signal } from "../index.ts";
import { createStateHistory } from "./state-history.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createStateHistory", () => {
  it("starts with the current getter value in history", () => {
    const s = signal(0);
    let h!: ReturnType<typeof createStateHistory<number>>;
    effectScope(() => {
      h = createStateHistory(() => s());
    });
    expect(h.history()).toEqual([0]);
    expect(h.index()).toBe(0);
  });

  it("records new values", () => {
    const s = signal(0);
    let h!: ReturnType<typeof createStateHistory<number>>;
    effectScope(() => {
      h = createStateHistory(() => s());
    });
    s(1);
    s(2);
    expect(h.history()).toEqual([0, 1, 2]);
    expect(h.index()).toBe(2);
  });

  it("canUndo is false initially", () => {
    const s = signal(0);
    let h!: ReturnType<typeof createStateHistory<number>>;
    effectScope(() => {
      h = createStateHistory(() => s());
    });
    expect(h.canUndo()).toBe(false);
  });

  it("canUndo is true after a change", () => {
    const s = signal(0);
    let h!: ReturnType<typeof createStateHistory<number>>;
    effectScope(() => {
      h = createStateHistory(() => s());
    });
    s(1);
    expect(h.canUndo()).toBe(true);
  });

  it("undo moves the index back", () => {
    const s = signal(0);
    let h!: ReturnType<typeof createStateHistory<number>>;
    effectScope(() => {
      h = createStateHistory(() => s());
    });
    s(1);
    s(2);
    h.undo();
    expect(h.index()).toBe(1);
    expect(h.canRedo()).toBe(true);
  });

  it("redo moves the index forward", () => {
    const s = signal(0);
    let h!: ReturnType<typeof createStateHistory<number>>;
    effectScope(() => {
      h = createStateHistory(() => s());
    });
    s(1);
    s(2);
    h.undo();
    h.redo();
    expect(h.index()).toBe(2);
    expect(h.canRedo()).toBe(false);
  });

  it("new change after undo drops the future", () => {
    const s = signal(0);
    let h!: ReturnType<typeof createStateHistory<number>>;
    effectScope(() => {
      h = createStateHistory(() => s());
    });
    s(1);
    s(2);
    h.undo();
    s(3);
    expect(h.history()).toEqual([0, 1, 3]);
    expect(h.canRedo()).toBe(false);
  });

  it("clear resets history to the current value", () => {
    const s = signal(0);
    let h!: ReturnType<typeof createStateHistory<number>>;
    effectScope(() => {
      h = createStateHistory(() => s());
    });
    s(1);
    s(2);
    h.clear();
    expect(h.history()).toEqual([2]);
    expect(h.index()).toBe(0);
  });
});
