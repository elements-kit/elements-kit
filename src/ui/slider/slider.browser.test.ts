import { afterEach, expect, it } from "vitest";
import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "./slider.css";

let host: HTMLDivElement | undefined;
afterEach(() => host?.remove());

it("leaves the surface behind a native slider visible", () => {
  host = document.createElement("div");
  host.style.background = "rgb(45, 55, 65)";
  host.dataset.neutral = "gray";
  host.dataset.accent = "mint";
  document.body.append(host);

  for (const variant of ["surface", "soft"]) {
    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "x-slider";
    slider.dataset.variant = variant;
    host.append(slider);
    expect(getComputedStyle(slider).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(slider).appearance).toBe("auto");
  }
});
