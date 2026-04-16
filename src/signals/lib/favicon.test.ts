import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createFavicon } from "./favicon.ts";

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("createFavicon", () => {
  it("creates a link element if none exists", () => {
    effectScope(() => {
      createFavicon("/icon.png");
    });
    const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    expect(link).not.toBeNull();
    expect(link?.href).toContain("/icon.png");
  });

  it("updates favicon href when signal changes", () => {
    let fav!: ReturnType<typeof createFavicon>;
    effectScope(() => {
      fav = createFavicon("/old.png");
    });
    fav("/new.png");
    const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    expect(link?.href).toContain("/new.png");
  });
});
