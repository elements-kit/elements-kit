import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createSearchParams } from "./search-params.ts";

afterEach(() => {
  document.body.innerHTML = "";
  history.replaceState(null, "", location.pathname);
});

describe("createSearchParams", () => {
  it("reads initial search params", () => {
    let sp!: ReturnType<typeof createSearchParams>;
    effectScope(() => {
      sp = createSearchParams();
    });
    expect(sp.params()).toBeInstanceOf(URLSearchParams);
  });

  it("set() updates a param", () => {
    let sp!: ReturnType<typeof createSearchParams>;
    effectScope(() => {
      sp = createSearchParams();
    });
    sp.set("q", "hello");
    expect(sp.get("q")).toBe("hello");
    expect(sp.params().get("q")).toBe("hello");
  });

  it("delete() removes a param", () => {
    let sp!: ReturnType<typeof createSearchParams>;
    effectScope(() => {
      sp = createSearchParams();
    });
    sp.set("q", "hello");
    sp.delete("q");
    expect(sp.get("q")).toBeNull();
  });

  it("updates on popstate event", () => {
    let sp!: ReturnType<typeof createSearchParams>;
    effectScope(() => {
      sp = createSearchParams();
    });
    history.replaceState(null, "", "?foo=bar");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(sp.get("foo")).toBe("bar");
  });

  it("stops reacting after Symbol.dispose", () => {
    let sp!: ReturnType<typeof createSearchParams>;
    effectScope(() => {
      sp = createSearchParams();
    });
    sp[Symbol.dispose]();
    history.replaceState(null, "", "?x=1");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(sp.get("x")).toBeNull();
  });
});
