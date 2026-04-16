import { describe, it, expect, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createIsDocumentVisible } from "./is-document-visible.ts";

afterEach(() => {
  // Reset visibilityState to "visible" (happy-dom default)
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("createIsDocumentVisible", () => {
  it("starts as true when document is visible", () => {
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });

    let visible!: ReturnType<typeof createIsDocumentVisible>;
    effectScope(() => {
      visible = createIsDocumentVisible();
    });

    expect(visible()).toBe(true);
  });

  it("becomes false when document becomes hidden", () => {
    let visible!: ReturnType<typeof createIsDocumentVisible>;
    effectScope(() => {
      visible = createIsDocumentVisible();
    });

    setVisibility("hidden");
    expect(visible()).toBe(false);
  });

  it("becomes true again when document becomes visible", () => {
    let visible!: ReturnType<typeof createIsDocumentVisible>;
    effectScope(() => {
      visible = createIsDocumentVisible();
    });

    setVisibility("hidden");
    setVisibility("visible");
    expect(visible()).toBe(true);
  });

  it("stops reacting after scope disposal", () => {
    let visible!: ReturnType<typeof createIsDocumentVisible>;
    const stop = effectScope(() => {
      visible = createIsDocumentVisible();
    });

    stop();
    setVisibility("hidden");
    expect(visible()).toBe(true); // frozen
  });
});
