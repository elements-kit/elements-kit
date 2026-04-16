import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createLockBodyScroll } from "./lock-body-scroll.ts";

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("createLockBodyScroll", () => {
  it("sets body overflow to hidden", () => {
    effectScope(() => {
      createLockBodyScroll();
    });
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores original overflow on Symbol.dispose", () => {
    document.body.style.overflow = "scroll";
    let lock!: Disposable;
    effectScope(() => {
      lock = createLockBodyScroll();
    });
    expect(document.body.style.overflow).toBe("hidden");
    lock[Symbol.dispose]();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("restores empty overflow when no prior style", () => {
    document.body.style.overflow = "";
    let lock!: Disposable;
    effectScope(() => {
      lock = createLockBodyScroll();
    });
    lock[Symbol.dispose]();
    expect(document.body.style.overflow).toBe("");
  });
});
