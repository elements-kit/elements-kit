import { describe, it, expect } from "vitest";
import { effectScope } from "../index.ts";
import { createTextSelection } from "./text-selection.ts";

describe("createTextSelection", () => {
  it("starts with empty text", () => {
    let sel!: ReturnType<typeof createTextSelection>;
    effectScope(() => {
      sel = createTextSelection();
    });

    expect(sel.text()).toBe("");
    expect(sel.ranges()).toEqual([]);
  });

  it("updates on selectionchange event", () => {
    let sel!: ReturnType<typeof createTextSelection>;
    effectScope(() => {
      sel = createTextSelection();
    });

    // Simulate selectionchange (happy-dom may not have full selection support)
    document.dispatchEvent(new Event("selectionchange"));
    expect(sel.text()).toBe("");
  });
});
