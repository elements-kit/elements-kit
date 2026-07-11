import type { Meta, StoryObj } from "@storybook/html-vite";
import { effect } from "elements-kit/signals";
import "@/utilities/dom-lifecycle.ts";
import "../card/card.css";
import "../overlay/handle.css";
import { AUTO, ElementBox, WINDOW_BOX } from "./box.ts";
import { Draggable, HANDLES, rubber, Resizable } from "./gestures.ts";
import { place, Side, SIDES } from "./anchor.ts";

/**
 * overlay_next playground — reproduces every `UI/Overlay` story on the
 * `overlay_next` PRIMITIVES ALONE (`ElementBox`, `place`, `Draggable`,
 * `Resizable`, `spring`), with no `Overlay` class, no `--overlay-*` channel
 * system, and no constraint engine. Each story hand-wires geometry the way a
 * future `Overlay` façade eventually would — the point is to show how little
 * glue the box vocabulary needs.
 *
 * Deliberate gaps (features `overlay/` has that these primitives don't):
 *   • Modality / popover / top layer — panels are plain positioned divs,
 *     always shown (no open/close, no backdrop, no light-dismiss).
 *   • Flick-to-dismiss, flip/shift, arrow caret, tear-off, enter/exit CSS.
 *   • Constraints — deferred; `AnchoredWithin` / `Constrained` are not ported.
 * Docking is done with a story-level `effect` (`box.y = WINDOW.h - box.h`);
 * the scale-from-top-left render keeps the docked edge pinned during a resize.
 */

// A .x-handle's data-placement — overlay.css's exact data-resize vocabulary.
const PLACEMENTS = [
  "none",
  "block-start",
  "block-end",
  "inline-start",
  "inline-end",
  "start-start",
  "start-end",
  "end-start",
  "end-end",
] as const;
type Placement = (typeof PLACEMENTS)[number];

// data-placement → the resize coefficients it drives.
const PLACEMENT: Record<
  Exclude<Placement, "none">,
  (typeof HANDLES)[keyof typeof HANDLES]
> = {
  "inline-end": HANDLES.e,
  "inline-start": HANDLES.w,
  "block-end": HANDLES.s,
  "block-start": HANDLES.n,
  "end-end": HANDLES.se,
  "end-start": HANDLES.sw,
  "start-end": HANDLES.ne,
  "start-start": HANDLES.nw,
};

// Detent grids. Position (Anchored chip), free-window position, panel size.
const COLS = [120, 340, 560, 780];
const ROWS = [140, 300, 460, 620];
const WIN_X = [80, 280, 480, 680, 880];
const WIN_Y = [80, 220, 360, 500];
const SIZES_W = [120, 180, 240, 300];
const SIZES_H = [44, 72, 100, 128];
const clampW = rubber(100, 320, 220);
const clampH = rubber(36, 140, 120);

const IDENTITY = (x: number) => x;

let uid = 0;

/** A card panel driven by an `ElementBox`. The `.x-handle` is a SIBLING of the
 * card (overlay.css's frame > card split) so the card's clip can't chop the
 * grip; the card carries an id so a `Draggable` can listen on it without the
 * handle's pointerdown bubbling in. `grab` makes the whole card a move target. */
function Panel(
  id: string,
  title: string,
  // deno-lint-ignore no-explicit-any -- JSX node plumbing in a story helper
  body: any,
  handle?: Placement,
  grab?: boolean,
) {
  return (
    <div
      id={`${id}-panel`}
      style={`position: fixed; margin: 0; touch-action: none; ${
        grab ? "" : "pointer-events: none;"
      }`}
    >
      <div
        id={`${id}-card`}
        class:unset
        class:x-card
        data-variant="elevated"
        data-size="3"
        style={`width: 100%; height: 100%; margin: 0; box-sizing: border-box; ${
          grab ? "cursor: grab;" : ""
        }`}
      >
        <div id={`${id}-content`}>
          <strong>{title}</strong>
          {body}
        </div>
      </div>
      {handle && handle !== "none" && (
        <div id={`${id}-handle`} class:x-handle data-placement={handle} />
      )}
    </div>
  );
}

/** Story shell — a fixed root + a dom-lifecycle that runs `wire(root)` on
 * mount, with the panel(s) as children. */
// deno-lint-ignore-next-line no-explicit-any -- JSX node plumbing
function Stage(wire: (root: HTMLElement) => void, ...children: any[]) {
  return (
    <div style="position: fixed; inset: 0;">
      <dom-lifecycle
        onConnect={(self: Element) => wire(self.parentElement as HTMLElement)}
      />
      {children}
    </div>
  );
}

const meta = {
  title: "UI/Overlay Next",
  tags: ["experimental"],
} satisfies Meta;

export default meta;

/* ───────────────────────────── Window ─────────────────────────────────── */

/** Centered free window: drag the card to move (snaps to a coarse grid — the
 * primitives always snap), corner grip resizes. */
export const Window: StoryObj = {
  render: () => {
    const id = `on-${uid++}`;
    return Stage((root) => {
      const panelEl = root.querySelector(`#${id}-panel`) as HTMLElement;
      const cardEl = root.querySelector(`#${id}-card`) as HTMLElement;
      const handleEl = root.querySelector(`#${id}-handle`) as HTMLElement;
      const box = new ElementBox(panelEl);
      box.w = 360;
      box.h = 240;
      box.x = Math.round((WINDOW_BOX.w - 360) / 2); // initial center (once)
      box.y = Math.round((WINDOW_BOX.h - 240) / 2);

      new Draggable(box, { x: WIN_X, y: WIN_Y }, cardEl);
      new Resizable(box, HANDLES.se, handleEl, {
        detents: { w: [280, 360, 440, 520], h: [180, 240, 320, 400] },
        clamp: { w: rubber(220, 560, 300), h: rubber(140, 460, 240) },
      });
    }, Panel(id, "Window", <p>Drag to move · corner grip resizes.</p>, "end-end", true));
  },
};

/* ─────────────────────────── Bottom sheet ─────────────────────────────── */

/** Bottom-docked sheet, full width. Drag the top pill — the height snaps to
 * 25 / 60 / 90% of the viewport. The dock `effect` pins the bottom edge as the
 * height changes (no flick-to-dismiss — that's a missing feature). */
export const BottomSheet: StoryObj = {
  render: () => {
    const id = `on-${uid++}`;
    return Stage((root) => {
      const panelEl = root.querySelector(`#${id}-panel`) as HTMLElement;
      const handleEl = root.querySelector(`#${id}-handle`) as HTMLElement;
      const box = new ElementBox(panelEl);
      const H = WINDOW_BOX.h;
      box.x = 0;
      effect(() => (box.w = WINDOW_BOX.w)); // full width, tracks the window
      box.h = Math.round(H * 0.6);
      effect(() => (box.y = WINDOW_BOX.h - box.h)); // dock the bottom edge

      new Resizable(box, HANDLES.n, handleEl, {
        detents: {
          w: [box.w],
          h: [0.25, 0.6, 0.9].map((f) => Math.round(H * f)),
        },
        clamp: { w: IDENTITY, h: rubber(Math.round(H * 0.15), Math.round(H * 0.95), H) },
      });
    }, Panel(id, "Bottom sheet", <p>Drag the top pill — snaps to 25 / 60 / 90%.</p>, "block-start"));
  },
};

/* ──────────────────────────── Top sheet ───────────────────────────────── */

/** Top-docked sheet, full width. Grows downward from the fixed top edge (the
 * top-left transform origin already keeps the top pinned — no dock effect). */
export const TopSheet: StoryObj = {
  render: () => {
    const id = `on-${uid++}`;
    return Stage((root) => {
      const panelEl = root.querySelector(`#${id}-panel`) as HTMLElement;
      const handleEl = root.querySelector(`#${id}-handle`) as HTMLElement;
      const box = new ElementBox(panelEl);
      const H = WINDOW_BOX.h;
      box.x = 0;
      box.y = 0;
      effect(() => (box.w = WINDOW_BOX.w));
      box.h = Math.round(H * 0.6);

      new Resizable(box, HANDLES.s, handleEl, {
        detents: {
          w: [box.w],
          h: [0.25, 0.6, 0.9].map((f) => Math.round(H * f)),
        },
        clamp: { w: IDENTITY, h: rubber(Math.round(H * 0.15), Math.round(H * 0.95), H) },
      });
    }, Panel(id, "Top sheet", <p>Drag the bottom pill — grows from the top.</p>, "block-end"));
  },
};

/* ───────────────────────────── Drawer ─────────────────────────────────── */

/** Right-docked drawer, full height. Drag the inner (left) pill to resize the
 * width; the dock `effect` pins the right edge. */
export const Drawer: StoryObj = {
  render: () => {
    const id = `on-${uid++}`;
    return Stage((root) => {
      const panelEl = root.querySelector(`#${id}-panel`) as HTMLElement;
      const handleEl = root.querySelector(`#${id}-handle`) as HTMLElement;
      const box = new ElementBox(panelEl);
      const W = WINDOW_BOX.w;
      box.y = 0;
      effect(() => (box.h = WINDOW_BOX.h)); // full height
      box.w = 420;
      effect(() => (box.x = WINDOW_BOX.w - box.w)); // dock the right edge

      new Resizable(box, HANDLES.w, handleEl, {
        detents: { w: [320, 420, 520, 640], h: [box.h] },
        clamp: { w: rubber(240, Math.round(W * 0.8), W), h: IDENTITY },
      });
    }, Panel(id, "Drawer", <p>Drag the inner pill — resizes the width.</p>, "inline-start"));
  },
};

/* ────────────────────────── Corner panel ──────────────────────────────── */

/** Bottom-right-docked floating panel; the corner grip faces inward (top-left)
 * so the opposite, docked corner stays anchored while it resizes. */
export const CornerPanel: StoryObj = {
  render: () => {
    const id = `on-${uid++}`;
    return Stage((root) => {
      const panelEl = root.querySelector(`#${id}-panel`) as HTMLElement;
      const handleEl = root.querySelector(`#${id}-handle`) as HTMLElement;
      const box = new ElementBox(panelEl);
      const { w: W, h: H } = WINDOW_BOX;
      box.w = 300;
      box.h = Math.round(H * 0.6);
      effect(() => {
        box.x = WINDOW_BOX.w - box.w; // dock bottom-right
        box.y = WINDOW_BOX.h - box.h;
      });

      new Resizable(box, HANDLES.nw, handleEl, {
        detents: { w: [240, 300, 380, 460], h: [0.4, 0.6, 0.8].map((f) => Math.round(H * f)) },
        clamp: { w: rubber(200, Math.round(W * 0.6), W), h: rubber(160, Math.round(H * 0.9), H) },
      });
    }, Panel(id, "Corner panel", <p>Grip faces inward — the docked corner stays put.</p>, "start-start"));
  },
};

/* ──────────────────────────── Anchored ────────────────────────────────── */

interface AnchoredArgs {
  side: Side;
  gap: number;
  handle: Placement;
}

/** Anchor-following popover: drag the chip, the panel re-derives its placement
 * from `anchor.length(...)` in one effect (no flip/shift — that's missing).
 * The panel resizes from a handle; size renders as scale + blurs mid-drag. */
export const Anchored: StoryObj<AnchoredArgs> = {
  argTypes: {
    side: {
      control: "inline-radio",
      options: [...SIDES],
      description: "Which anchor edge the panel attaches to (the length() call)",
    },
    gap: {
      control: { type: "range", min: 0, max: 48, step: 2 },
      description: "px between anchor and panel",
    },
    handle: {
      control: "select",
      options: [...PLACEMENTS],
      description: "resize handle placement (edge → pill, corner → L-grip)",
    },
  },
  args: { side: "bottom", gap: 8, handle: "end-end" },
  render: (args) => {
    const id = `on-${uid++}`;
    return Stage(
      (root) => {
        const anchorEl = root.querySelector(`#${id}-chip`) as HTMLElement;
        const anchor = new ElementBox(anchorEl);
        anchor.x = 240;
        anchor.y = 220;

        const panelEl = root.querySelector(`#${id}-panel`) as HTMLElement;
        const overlay = new ElementBox(panelEl);
        overlay.w = 240;
        overlay.h = AUTO;

        place(overlay, anchor, args.side, args.gap);
        new Draggable(anchor, { x: COLS, y: ROWS });

        if (args.handle === "none") return;
        const contentEl = root.querySelector(`#${id}-content`) as HTMLElement;
        const handleEl = root.querySelector(`#${id}-handle`) as HTMLElement;
        // place() centers one axis, so the grabbed corner tracks the pointer
        // only if that axis resizes at 2×. bottom/top center X.
        const centeredX = args.side === "bottom" || args.side === "top";
        new Resizable(overlay, PLACEMENT[args.handle], handleEl, {
          detents: { w: SIZES_W, h: SIZES_H },
          clamp: { w: clampW, h: clampH },
          gain: { w: centeredX ? 2 : 1, h: centeredX ? 1 : 2 },
          onStart: () => (contentEl.style.filter = "blur(1px)"),
          onSettle: () => (contentEl.style.filter = ""),
        });
      },
      <div
        id={`${id}-chip`}
        style="position: fixed; display: grid; place-items: center; box-sizing: border-box; width: 140px; height: 44px; background: #2563eb; color: white; border-radius: 8px; font: 600 13px system-ui; cursor: grab; touch-action: none; user-select: none; box-shadow: 0 2px 8px rgb(0 0 0 / 0.2);"
      >
        anchor
      </div>,
      Panel(
        id,
        "Overlay panel",
        <p style="margin: 4px 0 0; font: 13px system-ui; color: #666;">
          Drag the chip — the panel tracks it. Resize from the corner.
        </p>,
        args.handle,
      ),
    );
  },
};
