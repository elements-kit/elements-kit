import { afterEach, describe, expect, it } from "vitest";
import { currentLocation } from "./location.ts";

afterEach(() => {
  location.hash = "";
  history.replaceState(null, "", "/");
});

describe("currentLocation (singleton)", () => {
  it("reads current hash", () => {
    expect(currentLocation.hash()).toBe(location.hash);
  });

  it("reads current href", () => {
    expect(typeof currentLocation.href()).toBe("string");
  });

  it("reads current pathname", () => {
    expect(typeof currentLocation.pathname()).toBe("string");
  });

  it("reads current search", () => {
    expect(typeof currentLocation.search()).toBe("string");
  });

  it("updates hash on hashchange", () => {
    location.hash = "#foo";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(currentLocation.hash()).toBe("#foo");
  });

  it("updates href on popstate", () => {
    history.replaceState(null, "", "/foo");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(currentLocation.href()).toMatch(/\/foo$/);
  });

  it("updates pathname on popstate", () => {
    history.replaceState(null, "", "/new-page");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(currentLocation.pathname()).toBe("/new-page");
  });

  it("updates href on hashchange", () => {
    history.replaceState(null, "", "/bar#baz");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(currentLocation.href()).toMatch(/#baz$/);
  });
});

describe("currentLocation (singleton)", () => {
  it("returns independent location signals", () => {
    const loc = currentLocation;
    expect(typeof loc.hash()).toBe("string");
    expect(typeof loc.href()).toBe("string");
    expect(typeof loc.pathname()).toBe("string");
    expect(typeof loc.search()).toBe("string");
  });

  it("all four properties update from a single event", () => {
    const loc = currentLocation;
    history.replaceState(null, "", "/factory-test?q=1#section");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(loc.pathname()).toBe("/factory-test");
    expect(loc.search()).toBe("?q=1");
    expect(loc.hash()).toBe("#section");
  });
});
