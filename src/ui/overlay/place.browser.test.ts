import { afterEach, describe, expect, it, vi } from "vitest";
import { effect, effectScope } from "@/signals/index.ts";
import { ElementBox, OverlayBox, PositionArea, place } from "./index.ts";

import "../styles/index.css";
import "./index.css";
import "./overlay.css";

// Real Chromium: open is having a size, and a closed overlay's anchor isn't measured.

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
  window.scrollTo({ top: 0, behavior: "instant" });
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/** Scroll the page, then wait for the `scroll` event and a frame after it. */
async function scrollPage(y: number) {
  const scrolled = new Promise((r) => window.addEventListener("scroll", r, { once: true, capture: true }));
  window.scrollTo({ top: y, behavior: "instant" });
  await scrolled;
  await frame();
}

function setup(kind: "popover" | "dialog", { glide = false } = {}) {
  // `.x-overlay` transitions `translate`: off by default, so a box that
  // follows its anchor is measured where it lands, not mid-way.
  document.body.innerHTML = `
    ${glide ? "" : "<style>.x-overlay { transition: none !important; }</style>"}
    <div style="block-size: 3000px">
      <button data-trigger style="margin-block-start: 200px">Open</button>
    </div>
    ${kind === "popover" ? `<div class="unset x-overlay" popover="manual" data-menu>Menu</div>` : `<dialog class="unset x-overlay" data-menu>Menu</dialog>`}`;
  const trigger = document.querySelector<HTMLElement>("[data-trigger]")!;
  const menu = document.querySelector<HTMLElement>("[data-menu]")!;
  const measure = vi.spyOn(trigger, "getBoundingClientRect");
  let overlay!: OverlayBox;
  stop = effectScope(() => {
    overlay = new OverlayBox(menu);
    const area = new PositionArea(new ElementBox(trigger), "block-end");
    effect(() => place(overlay, area));
  });
  return { trigger, menu, measure, overlay };
}

describe("place: a closed overlay", () => {
  it("doesn't measure its anchor on scroll", async () => {
    const { measure } = setup("popover");
    measure.mockClear();

    await scrollPage(150);

    expect(measure).not.toHaveBeenCalled();
  });

  it("opens under its anchor, not gliding in from where it was", async () => {
    // Transitions on: placed after its first style, it would glide from 0,0.
    const { trigger, menu } = setup("popover", { glide: true });

    menu.showPopover();
    await frame();

    expect(menu.getBoundingClientRect().top).toBeCloseTo(trigger.getBoundingClientRect().bottom, 0);
  });

  it("follows its anchor on scroll while open, and stops once closed", async () => {
    const { trigger, menu, measure } = setup("popover");
    menu.showPopover();
    await frame();

    await scrollPage(120);
    expect(menu.getBoundingClientRect().top).toBeCloseTo(trigger.getBoundingClientRect().bottom, 0);

    menu.hidePopover();
    await frame();
    measure.mockClear();
    await scrollPage(40);
    expect(measure).not.toHaveBeenCalled();
  });

  it("reads a dialog's open state, show() and close() alike", async () => {
    const { trigger, menu, measure, overlay } = setup("dialog");
    await frame();
    expect(overlay.open).toBe(false);

    (menu as HTMLDialogElement).show();
    await frame();
    expect(overlay.open).toBe(true);
    expect(menu.getBoundingClientRect().top).toBeCloseTo(trigger.getBoundingClientRect().bottom, 0);

    (menu as HTMLDialogElement).close();
    await frame();
    expect(overlay.open).toBe(false);
    measure.mockClear();
    await scrollPage(60);
    expect(measure).not.toHaveBeenCalled();
  });

  it("any element with a size is open", async () => {
    document.body.innerHTML = `<div data-plain>Tip</div>`;
    let overlay!: OverlayBox;
    stop = effectScope(() => {
      overlay = new OverlayBox(document.querySelector<HTMLElement>("[data-plain]")!);
    });
    await frame();
    expect(overlay.open).toBe(true);
  });
});
