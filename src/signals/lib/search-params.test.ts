import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createSearchParam } from "./search-params.ts";

afterEach(() => {
  history.replaceState(null, "", location.pathname);
});

describe("createSearchParam", () => {
  it("returns null when param is absent", () => {
    let s!: ReturnType<typeof createSearchParam<string>>;
    effectScope(() => {
      s = createSearchParam("q");
    });
    expect(s()).toBeNull();
  });

  it("reads an existing param from the URL", () => {
    history.replaceState(null, "", "?q=hello");
    let s!: ReturnType<typeof createSearchParam<string>>;
    effectScope(() => {
      s = createSearchParam("q");
    });
    expect(s()).toBe("hello");
  });

  it("writing updates location.search", () => {
    let s!: ReturnType<typeof createSearchParam<string>>;
    effectScope(() => {
      s = createSearchParam("q");
    });
    s("world");
    expect(new URLSearchParams(location.search).get("q")).toBe("world");
  });

  it("writing null removes the param", () => {
    history.replaceState(null, "", "?q=hello");
    let s!: ReturnType<typeof createSearchParam<string>>;
    effectScope(() => {
      s = createSearchParam("q");
    });
    s(null);
    expect(new URLSearchParams(location.search).has("q")).toBe(false);
  });

  it("reacts to popstate events", () => {
    let s!: ReturnType<typeof createSearchParam<string>>;
    effectScope(() => {
      s = createSearchParam("q");
    });
    history.replaceState(null, "", "?q=changed");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(s()).toBe("changed");
  });

  it("supports custom serialise / deserialise", () => {
    let s!: ReturnType<typeof createSearchParam<number>>;
    effectScope(() => {
      s = createSearchParam("page", {
        serialise: (v) => String(v),
        deserialise: (raw) => Number(raw),
      });
    });
    s(42);
    expect(new URLSearchParams(location.search).get("page")).toBe("42");

    history.replaceState(null, "", "?page=7");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(s()).toBe(7);
  });

  it("preserves other params when writing", () => {
    history.replaceState(null, "", "?a=1&b=2");
    let s!: ReturnType<typeof createSearchParam<string>>;
    effectScope(() => {
      s = createSearchParam("a");
    });
    s("changed");
    const params = new URLSearchParams(location.search);
    expect(params.get("a")).toBe("changed");
    expect(params.get("b")).toBe("2");
  });

  it("uses pushState when history: 'push'", () => {
    const before = history.length;
    let s!: ReturnType<typeof createSearchParam<string>>;
    effectScope(() => {
      s = createSearchParam("q", { history: "push" });
    });
    s("pushed");
    expect(new URLSearchParams(location.search).get("q")).toBe("pushed");
    // pushState increases history length
    expect(history.length).toBe(before + 1);
  });
});
