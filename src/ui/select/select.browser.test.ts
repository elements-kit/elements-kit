import { afterEach, describe, expect, it } from "vitest";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "./select.css";

document.documentElement.dataset.neutral = "gray";

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

function mount(dir: "ltr" | "rtl"): HTMLSelectElement {
  host = document.createElement("div");
  host.dir = dir;
  host.innerHTML = `<select class="x-select"><option>One</option></select>`;
  document.body.append(host);
  return host.querySelector("select")!;
}

describe("x-select direction", () => {
  it("puts the chevron and its padding on the right in LTR", () => {
    const s = getComputedStyle(mount("ltr"));
    expect(s.backgroundPositionX).toBe("calc(100% - 12px)");
    expect(parseFloat(s.paddingRight)).toBeGreaterThan(parseFloat(s.paddingLeft));
  });

  it("puts the chevron and its padding on the left in RTL", () => {
    const s = getComputedStyle(mount("rtl"));
    expect(s.backgroundPositionX).toBe("12px");
    expect(parseFloat(s.paddingLeft)).toBeGreaterThan(parseFloat(s.paddingRight));
  });
});

describe("x-select own dir attribute", () => {
  it("keeps the chevron on the right for a dir=ltr select in an RTL page", () => {
    const s = mount("rtl");
    s.dir = "ltr";
    expect(getComputedStyle(s).backgroundPositionX).toBe("calc(100% - 12px)");
  });

  it("puts the chevron on the left for a dir=rtl select in an LTR page", () => {
    const s = mount("ltr");
    s.dir = "rtl";
    expect(getComputedStyle(s).backgroundPositionX).toBe("12px");
  });
});
