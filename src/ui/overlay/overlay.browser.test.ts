import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { signal } from "@/signals/index.ts";
import "../styles/space.css";
import "../styles/radius.css";
import "./index.css";
import "./overlay.css";
import { AUTO, Anchor, Constraint, Overlay } from "./index.ts";

// Kill morph transitions so geometry is asserted at its settled value, not
// mid-animation.
beforeAll(() => {
  const s = document.createElement("style");
  s.textContent = ".x-overlay { transition: none !important; }";
  document.head.appendChild(s);
});

/**
 * Real-browser (Playwright/Chromium) interaction + geometry tests — the six
 * ElementBox-migration regressions, verified against true layout and gestures:
 * honored size, anchored placement, within-boundary, docking, resize snap, and
 * tear-off return. (Unit logic lives in overlay.test.ts / anchor.test.ts.)
 */

const disposers: Array<() => void> = [];
afterEach(() => {
  for (const d of disposers.splice(0)) d();
  document.body.innerHTML = "";
});

const raf = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeOverlay(cfg: {
  popover?: "auto" | "manual";
  style?: string;
  handles?: { placement: string; detents?: string }[];
} = {}): HTMLDialogElement {
  const el = document.createElement("dialog");
  el.className = "unset x-overlay";
  if (cfg.popover) el.setAttribute("popover", cfg.popover);
  if (cfg.style) el.style.cssText = cfg.style;
  const card = document.createElement("div");
  card.className = "unset x-card";
  card.style.cssText = "padding:16px; box-sizing:border-box; background:#fff";
  card.textContent = "Overlay content sized by its text and padding.";
  el.appendChild(card);
  for (const h of cfg.handles ?? []) {
    const grip = document.createElement("div");
    grip.className = "x-handle";
    grip.dataset.placement = h.placement;
    if (h.detents) grip.dataset.detents = h.detents;
    el.appendChild(grip);
  }
  document.body.appendChild(el);
  return el;
}

function trigger(style: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.style.cssText = `position:fixed; ${style}`;
  b.textContent = "trigger";
  document.body.appendChild(b);
  return b;
}

function show(el: HTMLDialogElement) {
  if (el.hasAttribute("popover")) el.showPopover();
  else el.showModal();
}

const pe = (type: string, x: number, y: number) =>
  new PointerEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, pointerId: 1 });
/** Drive a pointer drag on the handle itself — synthetic events don't get
 * pointer capture, so every event must target the gesture's listener (`grip`);
 * real pointers route moves to it via capture. */
async function drag(
  grip: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  grip.dispatchEvent(pe("pointerdown", from.x, from.y));
  await sleep(16);
  grip.dispatchEvent(pe("pointermove", to.x, to.y));
  await sleep(16);
  grip.dispatchEvent(pe("pointerup", to.x, to.y));
  await raf();
}

describe("Overlay — real browser", () => {
  it("honors --overlay-w on an anchored popover", async () => {
    const t = trigger("top:200px; left:200px; width:80px; height:30px");
    const el = makeOverlay({ popover: "manual", style: "--overlay-w: 260px" });
    const o = new Overlay(el, { anchor: new Anchor(t) });
    disposers.push(() => o.dispose());
    show(el);
    await raf();
    expect(Math.round(el.getBoundingClientRect().width)).toBe(260);
  });

  it("places an anchored popover below and centered on its trigger", async () => {
    const t = trigger("top:180px; left:300px; width:100px; height:32px");
    const el = makeOverlay({ popover: "manual", style: "--overlay-w: 200px" });
    const o = new Overlay(el, { anchor: new Anchor(t) });
    disposers.push(() => o.dispose());
    show(el);
    await raf();
    const tr = t.getBoundingClientRect();
    const d = el.getBoundingClientRect();
    expect(d.top).toBeGreaterThanOrEqual(tr.bottom - 1); // below
    expect(Math.abs(d.left + d.width / 2 - (tr.left + tr.width / 2))).toBeLessThan(8); // centered
  });

  it("keeps an anchored popover inside its within boundary", async () => {
    const box = document.createElement("div");
    box.style.cssText = "position:fixed; left:60px; top:60px; width:360px; height:300px";
    document.body.appendChild(box);
    const t = trigger("left:380px; top:330px; width:40px; height:24px"); // near the corner
    const el = makeOverlay({ popover: "manual", style: "--overlay-w: 220px" });
    const o = new Overlay(el, { anchor: new Anchor(t), within: box });
    disposers.push(() => o.dispose());
    show(el);
    await raf();
    const c = box.getBoundingClientRect();
    const d = el.getBoundingClientRect();
    expect(d.left).toBeGreaterThanOrEqual(c.left - 1);
    expect(d.top).toBeGreaterThanOrEqual(c.top - 1);
    expect(d.right).toBeLessThanOrEqual(c.right + 1);
    expect(d.bottom).toBeLessThanOrEqual(c.bottom + 1);
  });

  it("dock('bottom') sits flush against the constraint bottom", async () => {
    const el = makeOverlay({ popover: "manual" });
    const region = new Constraint({ x: 0, y: 0, w: 800, h: 600 });
    const o = new Overlay(el, { within: region, box: { x: 0, y: 0 } });
    disposers.push(() => o.dispose());
    show(el);
    o.set({ x: 0, w: 800, h: 200 });
    o.dock("bottom");
    await raf();
    expect(Math.round(el.getBoundingClientRect().bottom)).toBe(600);
  });

  it("resize snaps to a data-detent", async () => {
    const el = makeOverlay({
      popover: "manual",
      handles: [{ placement: "block-start", detents: "0.25 0.5 0.75" }],
    });
    const region = new Constraint({ x: 0, y: 0, w: 800, h: 800 });
    const o = new Overlay(el, { within: region, box: { x: 0, y: 0 } });
    disposers.push(() => o.dispose());
    show(el);
    o.set({ x: 0, w: 800, h: 480 }); // 60% — between the 400 and 600 detents
    o.dock("bottom");
    await raf();
    const grip = el.querySelector<HTMLElement>('.x-handle[data-placement="block-start"]')!;
    const g = grip.getBoundingClientRect();
    // Drag the top pill up (taller) and release → snaps to a detent (× 800).
    await drag(grip, { x: g.x + g.width / 2, y: g.y }, { x: g.x + g.width / 2, y: g.y - 120 });
    const h = el.getBoundingClientRect().height;
    const detents = [0.25, 0.5, 0.75].map((f) => f * 800);
    expect(detents.some((d) => Math.abs(d - h) <= 12)).toBe(true);
  });

  it("tear-off returns to the anchor on reopen", async () => {
    const t = trigger("top:150px; left:150px; width:60px; height:30px");
    const el = makeOverlay({
      popover: "manual",
      style: "--overlay-w: 200px",
      handles: [{ placement: "move" }],
    });
    const o = new Overlay(el, { anchor: new Anchor(t) });
    disposers.push(() => o.dispose());
    show(el);
    await raf();
    const before = el.getBoundingClientRect();
    const move = el.querySelector<HTMLElement>('.x-handle[data-placement="move"]')!;
    const m = move.getBoundingClientRect();
    // Tear it off far from the trigger.
    await drag(move, { x: m.x + 5, y: m.y + 5 }, { x: m.x + 300, y: m.y + 260 });
    el.hidePopover();
    await sleep(50);
    show(el); // reopen → re-pin
    await raf();
    const after = el.getBoundingClientRect();
    expect(Math.abs(after.left - before.left)).toBeLessThan(6);
    expect(Math.abs(after.top - before.top)).toBeLessThan(6);
  });

  it("place() centers a free overlay in the viewport", async () => {
    const el = makeOverlay({ popover: "manual" });
    const o = new Overlay(el, { box: { x: 0, y: 0 } });
    disposers.push(() => o.dispose());
    show(el);
    o.set({ w: 480, h: 360 });
    o.place();
    await raf();
    const d = el.getBoundingClientRect();
    expect(Math.abs(d.left + d.width / 2 - window.innerWidth / 2)).toBeLessThan(4);
    expect(Math.abs(d.top + d.height / 2 - window.innerHeight / 2)).toBeLessThan(4);
  });

  it("an anchored popover that flips above does not overlap its trigger", async () => {
    // Trigger near the bottom edge so block-end can't fit → flips above.
    const t = trigger(`top:${window.innerHeight - 80}px; left:300px; width:100px; height:32px`);
    const el = makeOverlay({ popover: "manual", style: "--overlay-w: 200px" });
    const o = new Overlay(el, { anchor: new Anchor(t) });
    disposers.push(() => o.dispose());
    show(el);
    await raf();
    const tr = t.getBoundingClientRect();
    const d = el.getBoundingClientRect();
    expect(d.bottom).toBeLessThanOrEqual(tr.top + 1); // fully above, no overlap
  });

  it("a reactive-target anchor near the bottom edge flips above (Anchored story)", async () => {
    const t = trigger(`top:${window.innerHeight - 80}px; left:300px; width:100px; height:32px`);
    const target = signal<Element | null>(null);
    const el = makeOverlay({ popover: "manual", style: "--overlay-w: 260px" });
    const o = new Overlay(el, { anchor: new Anchor(() => target() ?? undefined) });
    disposers.push(() => o.dispose());
    show(el); // popover opens (size 0 → measured on a later frame)
    target(t); // then point at the bottom trigger, like clicking it
    await raf();
    await raf();
    const tr = t.getBoundingClientRect();
    const d = el.getBoundingClientRect();
    expect(d.bottom).toBeLessThanOrEqual(tr.top + 1); // above, not over
  });

  it("a drawer clamps its height to a within-constraint", async () => {
    const box = document.createElement("div");
    box.style.cssText = "position:fixed; left:40px; top:40px; width:600px; height:400px";
    document.body.appendChild(box);
    const el = makeOverlay({ popover: "manual", handles: [{ placement: "inline-start" }] });
    const o = new Overlay(el, { within: new Constraint(box), box: { x: 0, y: 0 } });
    disposers.push(() => o.dispose());
    show(el);
    o.set({ w: 320, h: 9999 }); // request full height → clamp to the container
    o.place("right");
    await raf();
    const c = box.getBoundingClientRect();
    const d = el.getBoundingClientRect();
    expect(Math.round(d.height)).toBeLessThanOrEqual(Math.round(c.height) + 1);
    expect(d.bottom).toBeLessThanOrEqual(c.bottom + 1);
    expect(d.right).toBeLessThanOrEqual(c.right + 1);
  });

  // Locks the morph grid: switching cells on ONE constrained overlay must land
  // each shape on its edge — no stale state from the previous cell.
  describe("constrained morph grid (place)", () => {
    function constrained() {
      const box = document.createElement("div");
      box.style.cssText = "position:fixed; left:60px; top:60px; width:640px; height:420px";
      document.body.appendChild(box);
      const el = makeOverlay({ popover: "manual" });
      const o = new Overlay(el, { within: new Constraint(box), box: { x: 0, y: 0 } });
      disposers.push(() => o.dispose());
      show(el);
      return { el, box, o };
    }
    const cell = (
      o: Overlay,
      full: { w: boolean; h: boolean },
      ...sides: ("top" | "bottom" | "left" | "right")[]
    ) => {
      o.set({ w: full.w ? Infinity : AUTO, h: full.h ? Infinity : AUTO });
      o.place(...sides);
    };

    it("corner (top-left) → top (full width, docked top) stays anchored", async () => {
      const { el, box, o } = constrained();
      cell(o, { w: false, h: false }, "left", "top"); // ↖ content, top-left
      await raf();
      let d = el.getBoundingClientRect();
      let c = box.getBoundingClientRect();
      expect(Math.abs(d.left - c.left)).toBeLessThan(2);
      expect(Math.abs(d.top - c.top)).toBeLessThan(2);

      cell(o, { w: true, h: false }, "top"); // ↑ full width, docked top
      await raf();
      d = el.getBoundingClientRect();
      c = box.getBoundingClientRect();
      expect(Math.abs(d.top - c.top)).toBeLessThan(2); // still at top
      expect(Math.abs(d.left - c.left)).toBeLessThan(2); // full width → left edge
      expect(Math.abs(d.width - c.width)).toBeLessThan(2);
    });

    it("bottom-right corner → center → top-left, each on its edge", async () => {
      const { el, box, o } = constrained();
      cell(o, { w: false, h: false }, "bottom", "right"); // ↘
      await raf();
      let d = el.getBoundingClientRect();
      let c = box.getBoundingClientRect();
      expect(Math.abs(d.right - c.right)).toBeLessThan(2);
      expect(Math.abs(d.bottom - c.bottom)).toBeLessThan(2);

      cell(o, { w: false, h: false }); // ● center
      await raf();
      d = el.getBoundingClientRect();
      c = box.getBoundingClientRect();
      expect(Math.abs(d.left + d.width / 2 - (c.left + c.width / 2))).toBeLessThan(2);
      expect(Math.abs(d.top + d.height / 2 - (c.top + c.height / 2))).toBeLessThan(2);

      cell(o, { w: false, h: false }, "left", "top"); // ↖
      await raf();
      d = el.getBoundingClientRect();
      c = box.getBoundingClientRect();
      expect(Math.abs(d.left - c.left)).toBeLessThan(2);
      expect(Math.abs(d.top - c.top)).toBeLessThan(2);
    });
  });
});
