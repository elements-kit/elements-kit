import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "@/signals/index.ts";
import { pathname } from "./pathname.ts";

afterEach(() => {
  history.replaceState(null, "", "/");
});

describe("pathname (singleton)", () => {
  it("reads the current pathname", () => {
    expect(typeof pathname()).toBe("string");
  });

  it("reacts to popstate events", () => {
    history.replaceState(null, "", "/new-page");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(pathname()).toBe("/new-page");
  });

  it("remains reactive after scope disposal", () => {
    // Singleton signals are not tied to effectScope disposal
    history.replaceState(null, "", "/gone");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(pathname()).toBe("/gone");
  });
});
