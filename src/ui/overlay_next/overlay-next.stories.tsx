import type { Meta, StoryObj } from "@storybook/html-vite";
import { effect } from "elements-kit/signals";
import "@/utilities/dom-lifecycle.ts";
import "../card/card.css";
import { ElementBox } from "./box.ts";
import { Motion } from "./motion.ts";
import { anchor_length } from "./anchor.ts";

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

const SIDES = ["bottom", "top", "right", "left"] as const;
type Side = (typeof SIDES)[number];

interface Args {
  side: Side;
  gap: number;
}

/** The whole positioning engine: the anchor vocabulary → a viewport box.
 * Reads reactive fields (anchor lines, overlay size), so calling it in an
 * `effect` re-runs whenever the anchor moves or the panel resizes. */
function place(side: Side, a: ElementBox, o: ElementBox, gap: number) {
  switch (side) {
    case "bottom":
      return {
        x: anchor_length(a, "left", "center") - o.w / 2,
        y: anchor_length(a, "top", "bottom") + gap,
      };
    case "top":
      return {
        x: anchor_length(a, "left", "center") - o.w / 2,
        y: anchor_length(a, "top", "top") - gap - o.h,
      };
    case "right":
      return {
        x: anchor_length(a, "left", "right") + gap,
        y: anchor_length(a, "top", "center") - o.h / 2,
      };
    case "left":
      return {
        x: anchor_length(a, "left", "left") - gap - o.w,
        y: anchor_length(a, "top", "center") - o.h / 2,
      };
  }
}

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
  },
  args: { side: "bottom", gap: 8 },
  render: (args) => {
    const id = `on-${uid++}`;

    return (
      <div style="position: fixed; inset: 0;">
        <dom-lifecycle
          onConnect={(self) => {
            const root = self.parentElement as HTMLElement;
            const anchorEl = root.querySelector(`#${id}-chip`) as HTMLElement;
            const panel = root.querySelector(`#${id}-panel`) as HTMLElement;

            const a = new ElementBox(anchorEl);
            const overlay = new ElementBox(panel);
            a.x = 240; // initial chip box
            a.y = 220;
            a.w = 140;
            a.h = 44;
            overlay.w = 240; // panel width channel

            // THE positioning engine — one effect over the box vocabulary.
            // Storybook re-renders (fresh onConnect) on every control change,
            // so reading args here is enough; the effect re-runs on drag.
            effect(() => {
              const { x, y } = place(args.side, a, overlay, args.gap);
              overlay.x = x; // ElementBox writes --x / --y
              overlay.y = y;
              panel.dataset.side = args.side;
            });

            // Drag the chip → move the anchor Box → the panel follows.
            // Two 1-D Motions (x, y) until Motion goes multi-dimensional.
            let mx: Motion;
            let my: Motion;
            let abort: undefined | (() => void);
            anchorEl.addEventListener("pointerdown", (e) => {
              anchorEl.setPointerCapture(e.pointerId);
              mx = new Motion(e.clientX); // accumulates the pointer deltas from 0
              my = new Motion(e.clientY);
              abort = effect(() => {
                a.displacement.x = mx.displacement; // ACCUMULATED delta → --dx transform
                a.displacement.y = my.displacement;
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
              a.displacement.apply();
              abort?.();
            };
            anchorEl.addEventListener("pointerup", up);
            anchorEl.addEventListener("pointercancel", up);
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

        {/* The overlay — an ElementBox positioned from --x / --y. */}
        <div
          id={`${id}-panel`}
          class:unset
          class:x-card
          data-variant="elevated"
          data-size="3"
          style="position: fixed; margin: 0; pointer-events: none;"
        >
          <strong>Overlay panel</strong>
          <p style="margin: 4px 0 0; font: 13px system-ui; color: #666;">
            Positioned by <code>overlay.x = a.length(...)</code> inside one
            effect. No imperative repositioning.
          </p>
        </div>
      </div>
    );
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

/** Drag the anchor; switch the side; watch the panel re-derive. */
export const Anchored: Story = {};
