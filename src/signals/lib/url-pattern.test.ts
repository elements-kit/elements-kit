import { describe, expect, it } from "vitest";
import { computed, effectScope, signal } from "../index.ts";
import { createURLPattern } from "./url-pattern.ts";

describe("createURLPattern", () => {
  it("matches a pathname with named params", () => {
    const url = signal("https://example.com/users/42");
    let m!: ReturnType<typeof createURLPattern>;
    effectScope(() => {
      m = createURLPattern(url, { pathname: "/users/:id" });
    });
    const r = m();
    expect(r).not.toBeNull();
    expect(r!.pathname.groups.id).toBe("42");
  });

  it("returns null when pattern does not match", () => {
    const url = signal("https://example.com/other");
    let m!: ReturnType<typeof createURLPattern>;
    effectScope(() => {
      m = createURLPattern(url, { pathname: "/users/:id" });
    });
    expect(m()).toBeNull();
  });

  it("re-evaluates when source changes", () => {
    const url = signal("https://example.com/");
    let m!: ReturnType<typeof createURLPattern>;
    effectScope(() => {
      m = createURLPattern(url, { pathname: "/users/:id" });
    });
    expect(m()).toBeNull();
    url("https://example.com/users/7");
    expect(m()).not.toBeNull();
    expect(m()!.pathname.groups.id).toBe("7");
  });

  it("works with a URL object source", () => {
    const path = signal("/books/abc");
    const source = computed(() => new URL(path(), "https://example.com"));
    let m!: ReturnType<typeof createURLPattern>;
    effectScope(() => {
      m = createURLPattern(source, { pathname: "/books/:slug" });
    });
    const r = m();
    expect(r).not.toBeNull();
    expect(r!.pathname.groups.slug).toBe("abc");
  });

  it("extracts multiple params", () => {
    const url = signal("https://example.com/posts/2024/hello");
    let m!: ReturnType<typeof createURLPattern>;
    effectScope(() => {
      m = createURLPattern(url, { pathname: "/posts/:year/:slug" });
    });
    const r = m()!;
    expect(r.pathname.groups.year).toBe("2024");
    expect(r.pathname.groups.slug).toBe("hello");
  });

  it("supports wildcard patterns", () => {
    const url = signal("https://example.com/files/a/b/c");
    let m!: ReturnType<typeof createURLPattern>;
    effectScope(() => {
      m = createURLPattern(url, { pathname: "/files/*" });
    });
    expect(m()).not.toBeNull();
  });

  it("supports optional segments", () => {
    const url = signal("https://example.com/items");
    let m!: ReturnType<typeof createURLPattern>;
    effectScope(() => {
      m = createURLPattern(url, { pathname: "/items/:id?" });
    });
    expect(m()).not.toBeNull();
    expect(m()!.pathname.groups.id).toBeUndefined();

    url("https://example.com/items/5");
    expect(m()!.pathname.groups.id).toBe("5");
  });

  it("exposes full URLPatternResult", () => {
    const url = signal("https://example.com/test");
    let m!: ReturnType<typeof createURLPattern>;
    effectScope(() => {
      m = createURLPattern(url, { pathname: "/test" });
    });
    const r = m();
    expect(r).not.toBeNull();
    expect(r!.pathname.input).toBe("/test");
  });

  it("returns null when no input is provided", () => {
    const url = signal("https://example.com/anything");
    let m!: ReturnType<typeof createURLPattern>;
    effectScope(() => {
      m = createURLPattern(url);
    });
    expect(m()).toBeNull();
  });

  it("matches hostname patterns", () => {
    const url = signal("https://sub.example.com/");
    let m!: ReturnType<typeof createURLPattern>;
    effectScope(() => {
      m = createURLPattern(url, { hostname: ":sub.example.com" });
    });
    const r = m();
    expect(r).not.toBeNull();
    expect(r!.hostname.groups.sub).toBe("sub");
  });
});
