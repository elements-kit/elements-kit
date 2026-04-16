import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createBeforeUnload } from "./before-unload.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createBeforeUnload", () => {
  it("registers a beforeunload handler", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    effectScope(() => {
      createBeforeUnload("Are you sure?");
    });
    expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    addSpy.mockRestore();
  });

  it("removes the handler on Symbol.dispose", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    let bu!: Disposable;
    effectScope(() => {
      bu = createBeforeUnload();
    });
    bu[Symbol.dispose]();
    expect(removeSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
    removeSpy.mockRestore();
  });
});
