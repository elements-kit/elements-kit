import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "./index.css";
import "./overlay.css";

// Real Chromium: the deck rule is a selector the browser must accept.

afterEach(() => {
  document.body.innerHTML = "";
});

describe("data-overlay-deck", () => {
  it("scales the page back while a bottom sheet is open, and only then", () => {
    document.body.innerHTML = `
      <div data-overlay-deck style="transition: none"></div>
      <dialog class="unset x-overlay"><div class="x-handle" data-placement="block-start"></div></dialog>`;
    const deck = document.querySelector<HTMLElement>("[data-overlay-deck]")!;
    const sheet = document.querySelector("dialog")!;

    expect(getComputedStyle(deck).scale).toBe("none");
    sheet.setAttribute("open", "");
    expect(getComputedStyle(deck).scale).toBe("0.96");
  });

  it("leaves the page alone for a sheet with another handle", () => {
    document.body.innerHTML = `
      <div data-overlay-deck style="transition: none"></div>
      <dialog class="unset x-overlay" open><div class="x-handle" data-placement="inline-start"></div></dialog>`;

    expect(getComputedStyle(document.querySelector("[data-overlay-deck]")!).scale).toBe("none");
  });
});
