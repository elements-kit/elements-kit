import { describe, expect, it } from "vitest";
import { href } from "./href.ts";

describe("href (singleton)", () => {
  it("reads the current href", () => {
    expect(typeof href()).toBe("string");
  });

  it("reacts to popstate events", () => {
    history.replaceState(null, "", "/foo");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(href()).toMatch(/\/foo$/);
  });

  it("reacts to hashchange events", () => {
    history.replaceState(null, "", "/bar#baz");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(href()).toMatch(/#baz$/);
  });

  it("remains reactive after scope disposal", () => {
    history.replaceState(null, "", "/gone");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(href()).toMatch(/\/gone$/);
  });
});
