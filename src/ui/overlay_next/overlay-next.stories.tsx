import type { Meta, StoryObj } from "@storybook/html-vite";
import "@/utilities/dom-lifecycle.ts";
import "../card/card.css";
import "./handle.css";
import { AUTO, ElementBox } from "./box.ts";
import { Draggable, HANDLES, Resizable, rubber } from "./gestures.ts";
import { Side, place, SIDES } from "./anchor.ts";

/**
 * overlay_next playground — exercises the ONE working primitive so far:
 * reactive `box.length()` positioning (every `ElementBox` is `Anchorable`).
 * There is no `Overlay` wiring yet, so this story wires it by hand, which
 * is exactly the point — it shows how little glue the box vocabulary needs:
 *
 *   overlay.y = anchor.length("top", "bottom") + gap   // top: anchor(bottom)
 *   overlay.x = anchor.length("left", "center") - w/2  // centered
 *
 * The anchor is an `ElementBox`: dragging the chip writes its displacement,
 * the `effect` re-derives the placement from `anchor.length(...)`, and the
 * overlay `ElementBox` mirrors it onto the panel's `--x`/`--y` channels.
 * Drag the chip — the panel follows with zero imperative repositioning code.
 */

// A .x-handle's data-placement — position, cursor, shape (edge → pill,
// corner → L-grip), and the resize role, all from one value.
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

interface Args {
  side: Side;
  gap: number;
  handle: Placement;
}

// Detent grid the chip settles onto (top-left viewport coords).
const COLS = [120, 340, 560, 780];
const ROWS = [140, 300, 460, 620];

// Resize: elastic bounds during the drag, detents to settle onto.
const MIN_W = 100;
const MAX_W = 320;
const MIN_H = 36;
const MAX_H = 140;
const SIZES_W = [120, 180, 240, 300];
const SIZES_H = [44, 72, 100, 128];
const clampW = rubber(MIN_W, MAX_W, 220);
const clampH = rubber(MIN_H, MAX_H, 120);

// data-placement → the resize coefficients it drives (position AND role: a
// bottom-end grip resizes the bottom + inline-end).
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

let uid = 0;

const meta = {
  title: "UI/Overlay Next",
  tags: ["experimental"],
  argTypes: {
    side: {
      control: "inline-radio",
      options: [...SIDES],
      description:
        "Which anchor edge the panel attaches to (the length() call)",
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

    return (
      <dom-lifecycle
        onConnect={(self) => {
          const root = self.parentElement as HTMLElement;

          // Anchor — a draggable proxy for the reactive Box.
          const anchorEl = root.querySelector(`#${id}-chip`) as HTMLElement;
          const anchor = new ElementBox(anchorEl);
          anchor.x = 240; // initial chip position
          anchor.y = 220;

          // Overlay — driven width, content-sized height (AUTO); the anchor
          // above keeps its own measured w/h (persisted by ElementBox).
          const panel = root.querySelector(`#${id}-panel`) as HTMLElement;
          const overlay = new ElementBox(panel);
          overlay.w = 240;
          overlay.h = AUTO;

          place(overlay, anchor, args.side, args.gap);

          // Drag the chip → the anchor Box moves → the panel follows (place()
          // re-derives it in one effect). Release snaps to the detent grid.
          new Draggable(anchor, { x: COLS, y: ROWS });

          // Resize the overlay from the real .x-handle child — the SAME gesture
          // machine on w/h. data-placement picks the coefficients; the live
          // delta renders as scale (--sx/--sy) and the content blurs to mask the
          // distortion (blur the CONTENT, not the card: filter on a
          // backdrop-filtered element isolates it and blanks its surface).
          if (args.handle === "none") return; // no handle → no resize to wire
          const contentEl = root.querySelector(`#${id}-content`) as HTMLElement;
          const handleEl = root.querySelector(`#${id}-handle`) as HTMLElement;
          // place() centers one axis (both edges move), so the grabbed corner
          // tracks the pointer only if that axis resizes at 2×. bottom/top
          // center X; left/right center Y.
          const centeredX = args.side === "bottom" || args.side === "top";
          new Resizable(overlay, PLACEMENT[args.handle], handleEl, {
            detents: { w: SIZES_W, h: SIZES_H },
            clamp: { w: clampW, h: clampH },
            gain: { w: centeredX ? 2 : 1, h: centeredX ? 1 : 2 },
            onStart: () => (contentEl.style.filter = "blur(1px)"),
            onSettle: () => (contentEl.style.filter = ""),
          });
        }}
      >
        <button
          id={`${id}-chip`}
          class:unset
          class:x-button
          style:position="fixed"
          data-variant="soft"
        >
          anchor ⚓️
        </button>

        {/* The overlay is a FRAME, not the card — exactly overlay.css's
            `.x-overlay > .x-card` split. The card clips its own content
            (overflow:hidden + rounded corners); the .x-handle is a SIBLING of
            the card, so the clip can't chop the corner L-grip. The frame is
            passive (pointer-events:none); only the handle is a pointer target.
            ElementBox drives the frame's --w/--h; the card fills it. */}
        <div
          id={`${id}-panel`}
          style="position: fixed; margin: 0; pointer-events: none;"
        >
          <div
            class:unset
            class:x-card
            data-variant="elevated"
            data-size="3"
            style="width: 100%; height: 100%; margin: 0;"
          >
            {/* Content wrapper — the blur goes HERE, not on the card. Applying
                filter to the card would isolate it and kill its backdrop-filter
                surface (frosted-glass material), rendering the panel invisible. */}
            <div id={`${id}-content`}>
              <strong>Overlay panel</strong>
              <p style="margin: 4px 0 0; font: 13px system-ui; color: #666;">
                Positioned by <code>overlay.x = anchor.length(...)</code> inside
                one effect. Resize from the corner.
              </p>
            </div>
          </div>
          {args.handle !== "none" && (
            <div
              id={`${id}-handle`}
              class:x-handle
              data-placement={args.handle}
            />
          )}
        </div>
      </dom-lifecycle>
    );
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

/** Drag the anchor; switch the side; watch the panel re-derive. */
export const Anchored: Story = {};
