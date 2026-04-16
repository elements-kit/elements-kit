import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createDocumentTitle } from "./document-title.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createDocumentTitle", () => {
  it("sets document.title from initial value", () => {
    effectScope(() => {
      createDocumentTitle("My App");
    });
    expect(document.title).toBe("My App");
  });

  it("updates document.title when signal is written", () => {
    let title!: ReturnType<typeof createDocumentTitle>;
    effectScope(() => {
      title = createDocumentTitle("Initial");
    });
    title("Updated");
    expect(document.title).toBe("Updated");
  });

  it("reads from document.title if no initial value given", () => {
    document.title = "Existing Title";
    let title!: ReturnType<typeof createDocumentTitle>;
    effectScope(() => {
      title = createDocumentTitle();
    });
    expect(title()).toBe("Existing Title");
  });
});
