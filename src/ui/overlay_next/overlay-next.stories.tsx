import type { Meta, StoryObj } from "@storybook/html-vite";
import { effect } from "elements-kit/signals";
import "@/utilities/dom-lifecycle.ts";
import "../card/card.css";
import "./handle.css";
import { ElementBox } from "./box.ts";
import { HANDLES, rubber, snap, spring } from "./gestures.ts";
import { Motion } from "./motion.ts";
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
      <div style="position: fixed; inset: 0;">
        <dom-lifecycle
          onConnect={(self) => {
            const root = self.parentElement as HTMLElement;

            // Anchor
            const anchorEl = root.querySelector(`#${id}-chip`) as HTMLElement;
            const anchor = new ElementBox(anchorEl);
            anchor.x = 240; // initial chip box
            anchor.y = 220;
            anchor.w = 140;
            anchor.h = 44;

            // Overlay
            const panel = root.querySelector(`#${id}-panel`) as HTMLElement;
            const overlay = new ElementBox(panel);
            overlay.w = 240; // panel width channel

            place(overlay, anchor, args.side, args.gap);

            // Drag the chip → move the anchor Box → the panel follows.
            // Two 1-D Motions (x, y) until Motion goes multi-dimensional.
            let mx: Motion;
            let my: Motion;
            let abort: undefined | (() => void);
            // In-flight settle springs (position + size). Any gesture start
            // cancels them all and folds the leftover delta into base.
            let stopX: undefined | (() => void);
            let stopY: undefined | (() => void);
            let stopW: undefined | (() => void);
            let stopH: undefined | (() => void);
            const stopAll = () => {
              stopX?.();
              stopY?.();
              stopW?.();
              stopH?.();
            };
            anchorEl.addEventListener("pointerdown", (e) => {
              anchorEl.setPointerCapture(e.pointerId);
              stopAll(); // cancel any settle in progress …
              anchor.displacement.apply(); // … and fold its delta into base — no jump
              mx = new Motion(e.clientX); // accumulates the pointer deltas from 0
              my = new Motion(e.clientY);
              abort = effect(() => {
                anchor.displacement.x = mx.displacement; // ACCUMULATED delta → --dx transform
                anchor.displacement.y = my.displacement;
              });
              anchorEl.style.cursor = "grabbing";
            });
            anchorEl.addEventListener("pointermove", (e) => {
              if (!anchorEl.hasPointerCapture(e.pointerId)) return;
              mx.value = e.clientX; // feed the per-frame delta; Motion sums it
              my.value = e.clientY;
            });
            const up = (e: PointerEvent) => {
              anchorEl.style.cursor = "grab";
              try {
                anchorEl.releasePointerCapture(e.pointerId);
              } catch {}
              abort?.(); // stop the live drag projection first

              // Snap each axis to its nearest detent, projecting the fling.
              // Commit-up-front: base jumps to the detent so place() settles
              // now; the delta holds the pixels, then springs to 0 — the
              // apply() is implicit (delta reaches 0, already at target).
              const ox = anchor.x;
              const oy = anchor.y;
              const tx = snap(ox, mx.velocity, COLS);
              const ty = snap(oy, my.velocity, ROWS);
              anchor.x = tx;
              anchor.y = ty;
              anchor.displacement.x = ox - tx;
              anchor.displacement.y = oy - ty;
              stopX = spring(
                anchor.displacement.x,
                0,
                (d) => (anchor.displacement.x = d),
                {
                  velocity: mx.velocity,
                },
              );
              stopY = spring(
                anchor.displacement.y,
                0,
                (d) => (anchor.displacement.y = d),
                {
                  velocity: my.velocity,
                },
              );
            };
            anchorEl.addEventListener("pointerup", up);
            anchorEl.addEventListener("pointercancel", up);

            // Resize the OVERLAY from a real .x-handle child — a genuine event
            // target (no pseudo hit-testing). data-placement picks the
            // coefficients; same Motion pipeline on w/h. Size renders as scale
            // (--sx/--sy) and blurs during the drag; apply() reflows on settle.
            // Blur the content, NOT the card — filter on a backdrop-filtered
            // element isolates it and blanks its surface.
            if (args.handle === "none") return; // no handle → no resize to wire
            const contentEl = root.querySelector(
              `#${id}-content`,
            ) as HTMLElement;
            const handleEl = root.querySelector(`#${id}-handle`) as HTMLElement;
            const G = PLACEMENT[args.handle]; // placement drives the coefficients
            let rw: Motion;
            let rh: Motion;
            let rabort: undefined | (() => void);
            handleEl.addEventListener("pointerdown", (e) => {
              handleEl.setPointerCapture(e.pointerId);
              stopAll();
              overlay.displacement.apply();
              rw = new Motion(e.clientX);
              rh = new Motion(e.clientY);
              contentEl.style.filter = "blur(1px)"; // mask the scale distortion
              // place() centers the overlay on one axis, so that axis moves
              // BOTH edges — the corner tracks the pointer only if the size
              // changes at 2× there. bottom/top center X; left/right center Y.
              const centeredX = args.side === "bottom" || args.side === "top";
              const gainW = centeredX ? 2 : 1;
              const gainH = centeredX ? 1 : 2;
              rabort = effect(() => {
                // base + gain·coefficient·delta, resisted past the size bounds
                const w = clampW(
                  overlay.transform.w + gainW * G.w * rw.displacement,
                );
                const h = clampH(
                  overlay.transform.h + gainH * G.h * rh.displacement,
                );
                overlay.displacement.w = w - overlay.transform.w; // → --sx scale
                overlay.displacement.h = h - overlay.transform.h;
              });
            });
            handleEl.addEventListener("pointermove", (e) => {
              if (!handleEl.hasPointerCapture(e.pointerId)) return;
              rw.value = e.clientX;
              rh.value = e.clientY;
            });
            const rup = (e: PointerEvent) => {
              try {
                handleEl.releasePointerCapture(e.pointerId);
              } catch {}
              rabort?.();

              // Commit-up-front: base ← snapped size (--w/--h reflow crisp NOW),
              // scale holds the preview, then springs to 1. Blur clears once
              // both axes settle. place() re-centers the panel as w/h change.
              const ow = overlay.w;
              const oh = overlay.h;
              const tw = snap(ow, rw.velocity, SIZES_W);
              const th = snap(oh, rh.velocity, SIZES_H);
              overlay.w = tw;
              overlay.h = th;
              overlay.displacement.w = ow - tw;
              overlay.displacement.h = oh - th;
              let left = 2;
              const done = () => {
                if (--left === 0) contentEl.style.filter = "";
              };
              stopW = spring(
                overlay.displacement.w,
                0,
                (d) => (overlay.displacement.w = d),
                { velocity: rw.velocity },
                done,
              );
              stopH = spring(
                overlay.displacement.h,
                0,
                (d) => (overlay.displacement.h = d),
                { velocity: rh.velocity },
                done,
              );
            };
            handleEl.addEventListener("pointerup", rup);
            handleEl.addEventListener("pointercancel", rup);
          }}
        />

        <span style="position: absolute; top: 12px; left: 12px; font: 13px system-ui; color: #666; max-width: 320px;">
          Drag the blue chip — the panel tracks it via{" "}
          <code>anchor.length()</code>. Change <b>side</b>/<b>gap</b> in
          Controls.
        </span>

        {/* The anchor — a draggable proxy for the reactive Box. */}
        <div
          id={`${id}-chip`}
          style="position: fixed; display: grid; place-items: center; box-sizing: border-box; background: #2563eb; color: white; border-radius: 8px; font: 600 13px system-ui; cursor: grab; touch-action: none; user-select: none; box-shadow: 0 2px 8px rgb(0 0 0 / 0.2);"
        >
          anchor
        </div>

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
      </div>
    );
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

/** Drag the anchor; switch the side; watch the panel re-derive. */
export const Anchored: Story = {};
