import { describe, expect, it } from "vitest";
import { activeElement } from "./active-element.ts";

describe("activeElement (singleton)", () => {
  it("returns a computed that reads the current activeElement", () => {
    expect(activeElement()).toBe(document.activeElement);
  });

  it("updates when focus changes", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    expect(activeElement()).toBe(input);
    document.body.removeChild(input);
  });

  it("remains reactive after scope disposal", () => {
    // Singleton signals are not tied to disposal
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    expect(activeElement()).toBe(input);
    document.body.removeChild(input);
  });
});
