import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createPageLeave } from "./page-leave.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createPageLeave", () => {
  it("fires handler when mouse leaves the document", () => {
    const handler = vi.fn();
    effectScope(() => {
      createPageLeave(handler);
    });
    document.dispatchEvent(new MouseEvent("mouseleave"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("stops firing after Symbol.dispose", () => {
    const handler = vi.fn();
    let pl!: Disposable;
    effectScope(() => {
      pl = createPageLeave(handler);
    });
    pl[Symbol.dispose]();
    document.dispatchEvent(new MouseEvent("mouseleave"));
    expect(handler).not.toHaveBeenCalled();
  });
});
