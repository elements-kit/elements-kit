import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import "../styles/index.css";
import "../styles/palette/gray.css";
import "../styles/neutral/gray.css";
import "../styles/palette/mint.css";
import "../styles/accent/mint.css";
import "../styles/accent/neutral.css";
import "../button/button.css";
import "./toggle.css";

// Real browsers: stacked geometry, variant colors and focus are computed styles.

const ICON = `<svg width="1.25em" height="1.25em" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" /></svg>`;

document.documentElement.dataset.neutral = "gray";
document.documentElement.dataset.accent = "mint";

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

function mount(html: string): HTMLElement {
  host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  return host.firstElementChild as HTMLElement;
}

const toggle = (attrs: string, label = "Flag", checked = false) =>
  mount(
    `<label class="x-toggle" ${attrs}><input type="checkbox" class="unset"${checked ? " checked" : ""} />${ICON}<span>${label}</span></label>`,
  ) as HTMLLabelElement;

const box = (el: Element) => el.getBoundingClientRect();
const bg = (el: Element) => getComputedStyle(el).backgroundColor;

describe("x-toggle data-layout=stacked", () => {
  it("matches the stacked button at every size", () => {
    for (const size of ["1", "2", "3"]) {
      const t = toggle(`data-variant="soft" data-size="${size}" data-layout="stacked"`);
      const tBox = box(t);
      const tLabel = getComputedStyle(t.querySelector("span")!);
      const b = mount(
        `<button class="unset x-button" data-variant="soft" data-size="${size}" data-layout="stacked">${ICON}<span>Flag</span></button>`,
      );

      expect(tBox.height).toBe(box(b).height);
      expect(box(t.querySelector("svg")!).width).toBe(box(b.querySelector("svg")!).width);
      expect(tLabel.fontSize).toBe(getComputedStyle(b.querySelector("span")!).fontSize);
      expect(tLabel.lineHeight).toBe(getComputedStyle(b.querySelector("span")!).lineHeight);
      t.parentElement!.remove();
    }
  });

  it("is 56px square at size 2 with a --font-size-0 caption on --line-height-1", () => {
    const t = toggle(`data-variant="soft" data-size="2" data-layout="stacked"`);
    const label = getComputedStyle(t.querySelector("span")!);

    expect(box(t).height).toBe(56);
    expect(box(t).width).toBe(56);
    expect(label.fontSize).toBe("10px");
    expect(label.lineHeight).toBe("16px");
  });

  it("keeps one weight, so pressing doesn't resize it", () => {
    const offToggle = toggle(`data-variant="soft" data-layout="stacked"`, "Notifications");
    const off = box(offToggle);
    offToggle.parentElement!.remove();
    const on = box(toggle(`data-variant="soft" data-layout="stacked"`, "Notifications", true));

    expect(on.width).toBe(off.width);
  });

  it("wraps the label when constrained, growing taller", () => {
    const t = toggle(`data-variant="borderless" data-size="2" data-layout="stacked" style="width: 80px"`, "Photo Library");
    const label = t.querySelector("span")!;

    // two 16px lines under the 24px icon and 2px gap, 4px above and below
    expect(box(label).height).toBe(32);
    expect(box(t).height).toBe(66);
    expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
  });
});

describe("x-toggle data-layout=stacked-icon", () => {
  it("has no padding: a 36px square highlight, 4px gap, 16px label at size 2", () => {
    const t = toggle(`data-variant="borderless" data-size="2" data-layout="stacked-icon"`, "Flag", true);
    const icon = box(t.querySelector("svg")!);
    const label = box(t.querySelector("span")!);

    expect(getComputedStyle(t).padding).toBe("0px");
    expect(icon.width).toBe(36);
    expect(icon.height).toBe(36);
    expect(icon.top).toBe(box(t).top);
    expect(label.top - icon.bottom).toBe(4);
    expect(box(t).height).toBe(56);
    expect(box(t).width).toBe(56);
  });

  it("moves the variant's state onto the icon, the item stays clear", () => {
    const off = toggle(`data-variant="surface" data-layout="stacked-icon"`);
    expect(bg(off)).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(off).boxShadow).toBe("none");
    expect(getComputedStyle(off.querySelector("svg")!).boxShadow).not.toBe("none");
    off.parentElement!.remove();

    const on = toggle(`data-variant="borderless" data-layout="stacked-icon"`, "Flag", true);
    expect(bg(on)).toBe("rgba(0, 0, 0, 0)");
    expect(bg(on.querySelector("svg")!)).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("follows the toggle's radius", () => {
    const t = toggle(`data-variant="borderless" data-size="2" data-layout="stacked-icon"`, "Flag", true);
    expect(getComputedStyle(t.querySelector("svg")!).borderRadius).toBe(getComputedStyle(t).borderRadius);
  });
});

describe("x-toggle variants", () => {
  it("borderless: no fill at rest, filled when pressed", () => {
    expect(bg(toggle(`data-variant="borderless"`))).toBe("rgba(0, 0, 0, 0)");
    expect(bg(toggle(`data-variant="borderless"`, "Flag", true))).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("soft: pressed differs from rest even with a neutral accent", () => {
    const rest = bg(toggle(`data-variant="soft" data-accent="neutral"`));
    const pressed = bg(toggle(`data-variant="soft" data-accent="neutral"`, "Flag", true));
    const alpha = (c: string) => Number(c.match(/[\d.]+(?=\))/)?.[0] ?? 1);

    expect(pressed).not.toBe(rest);
    expect(alpha(pressed)).toBeGreaterThan(alpha(rest) * 2);
  });
});

describe("x-toggle focus", () => {
  it("shows the ring for keyboard focus, not for a click", async () => {
    const t = toggle(`data-variant="soft"`);

    await userEvent.click(t);
    expect(getComputedStyle(t).outlineStyle).toBe("none");

    await userEvent.tab({ shift: true });
    await userEvent.tab();
    expect(getComputedStyle(t).outlineStyle).toBe("solid");
  });
});
