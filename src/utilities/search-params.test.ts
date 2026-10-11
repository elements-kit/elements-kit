import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "@/signals/index.ts";
import { createSearchParam } from "./search-params.ts";

afterEach(() => {
  history.replaceState(null, "", location.pathname);
});

describe("createSearchParam", () => {
  it("returns null when param is absent", () => {
    let s!: ReturnType<typeof createSearchParam>;
    effectScope(() => {
      s = createSearchParam("q");
    });
    expect(s()).toBeNull();
  });

  it("reads an existing param from the URL", () => {
    history.replaceState(null, "", "?q=hello");
    let s!: ReturnType<typeof createSearchParam>;
    effectScope(() => {
      s = createSearchParam("q");
    });
    expect(s()).toBe("hello");
  });

  it("reacts to popstate events", () => {
    let s!: ReturnType<typeof createSearchParam>;
    effectScope(() => {
      s = createSearchParam("q");
    });
    history.replaceState(null, "", "?q=changed");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(s()).toBe("changed");
  });
});
