import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import {
  navigate,
  isLocalNavigationEvent,
  matches,
  match,
  patchHistory,
} from "@/utilities/routing.ts";

beforeAll(() => {
  patchHistory();
});

afterEach(() => {
  history.replaceState(null, "", "/");
});

describe("navigate", () => {
  it("pushes a new history entry", () => {
    navigate("/about");
    expect(location.pathname).toBe("/about");
  });

  it("replaces the current entry when replace is true", () => {
    const before = history.length;
    navigate("/replaced", { replace: true });
    expect(location.pathname).toBe("/replaced");
    expect(history.length).toBe(before);
  });

  it("dispatches pushstate event so currentLocation updates", () => {
    const handler = vi.fn();
    window.addEventListener("pushstate", handler);
    navigate("/dispatched");
    window.removeEventListener("pushstate", handler);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("dispatches replacestate event on replace", () => {
    const handler = vi.fn();
    window.addEventListener("replacestate", handler);
    navigate("/dispatched", { replace: true });
    window.removeEventListener("replacestate", handler);
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe("isLocalNavigationEvent", () => {
  function makeClick(
    el: HTMLAnchorElement,
    init: MouseEventInit = {},
  ): MouseEvent {
    const e = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ...init,
    });
    Object.defineProperty(e, "currentTarget", {
      value: el,
      configurable: true,
    });
    return e;
  }

  it("returns true for a same-origin link", () => {
    const el = document.createElement("a");
    el.href = "/linked";
    expect(isLocalNavigationEvent(makeClick(el))).toBe(true);
  });

  it("returns false for an external link", () => {
    const el = document.createElement("a");
    el.href = "https://example.com/page";
    expect(isLocalNavigationEvent(makeClick(el))).toBe(false);
  });

  it("returns false when metaKey is held", () => {
    const el = document.createElement("a");
    el.href = "/about";
    expect(isLocalNavigationEvent(makeClick(el, { metaKey: true }))).toBe(
      false,
    );
  });

  it("returns false when ctrlKey is held", () => {
    const el = document.createElement("a");
    el.href = "/about";
    expect(isLocalNavigationEvent(makeClick(el, { ctrlKey: true }))).toBe(
      false,
    );
  });

  it("returns false for download links", () => {
    const el = document.createElement("a");
    el.href = "/file.pdf";
    el.setAttribute("download", "");
    expect(isLocalNavigationEvent(makeClick(el))).toBe(false);
  });

  it("returns false for _blank links", () => {
    const el = document.createElement("a");
    el.href = "/page";
    el.setAttribute("target", "_blank");
    expect(isLocalNavigationEvent(makeClick(el))).toBe(false);
  });

  it("returns false for non-primary button clicks", () => {
    const el = document.createElement("a");
    el.href = "/page";
    expect(isLocalNavigationEvent(makeClick(el, { button: 1 }))).toBe(false);
  });
});

describe("matches", () => {
  it("returns true when current URL matches", () => {
    navigate("/users/42");
    const result = matches({ pathname: "/users/:id" });
    expect(result()).toBe(true);
  });

  it("returns false when current URL does not match", () => {
    navigate("/other");
    const result = matches({ pathname: "/users/:id" });
    expect(result()).toBe(false);
  });

  it("updates reactively on navigation", () => {
    const result = matches({ pathname: "/home" });
    navigate("/other");
    expect(result()).toBe(false);
    navigate("/home");
    expect(result()).toBe(true);
  });
});

describe("match", () => {
  it("returns null when current URL does not match", () => {
    navigate("/other");
    const result = match({ pathname: "/users/:id" });
    expect(result()).toBeNull();
  });

  it("returns URLPatternResult with groups when matched", () => {
    navigate("/users/42");
    const result = match({ pathname: "/users/:id" });
    expect(result()?.pathname.groups.id).toBe("42");
  });

  it("updates reactively on navigation", () => {
    const result = match({ pathname: "/posts/:slug" });
    navigate("/posts/hello");
    expect(result()?.pathname.groups.slug).toBe("hello");
    navigate("/other");
    expect(result()).toBeNull();
  });

  it("extracts multiple params", () => {
    navigate("/posts/2024/my-slug");
    const result = match({ pathname: "/posts/:year/:slug" });
    expect(result()?.pathname.groups.year).toBe("2024");
    expect(result()?.pathname.groups.slug).toBe("my-slug");
  });
});
