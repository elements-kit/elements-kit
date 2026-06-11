import type { Meta, StoryObj } from "@storybook/html-vite";
import { signal } from "elements-kit/signals";
import "../card/card.css";
import "../button/button.css";
import "./overlay.css";
import { createOverlayGestures, type OverlayGestures } from "./gestures.ts";

const PLACEMENTS = [
  "center",
  "block-start",
  "block-end",
  "inline-start",
  "inline-end",
  "block-start inline-start",
  "block-start inline-end",
  "block-end inline-start",
  "block-end inline-end",
] as const;

interface Args {
  placement: (typeof PLACEMENTS)[number];
  detent: "small" | "medium" | "large";
  modal: boolean;
  gestures: boolean;
}

let uid = 0;

const meta = {
  title: "UI/Overlay",
  argTypes: {
    placement: { control: "select", options: [...PLACEMENTS] },
    detent: {
      control: "select",
      options: ["small", "medium", "large"],
      description:
        "Size preset — heights on block-edge placements, widths on drawers and center",
    },
    modal: {
      control: "boolean",
      description:
        "Open with showModal() (backdrop, inert page) instead of popover (light dismiss, page interactive)",
    },
    gestures: {
      control: "boolean",
      description:
        "Attach createOverlayGestures — detent drag on sheets and drawers, corner resize on center, flick to dismiss",
    },
  },
  args: { placement: "center", detent: "medium", modal: true, gestures: true },
  render: (args) => {
    const id = `overlay-story-${uid++}`;
    const overlay = signal<HTMLDialogElement | null>();
    let gestures: OverlayGestures | undefined;
    return (
      <>
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size="2"
          popovertarget={args.modal ? undefined : id}
          on:click={() => {
            const el = overlay();
            if (!el) return;
            if (args.modal) el.showModal();
            gestures?.dispose();
            if (args.gestures) gestures = createOverlayGestures(el);
          }}
        >
          Open overlay
        </button>
        <dialog
          ref={overlay}
          id={id}
          class:unset
          class:x-overlay
          popover={args.modal ? undefined : "auto"}
          data-placement={args.placement}
          data-detent={args.detent}
        >
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Overlay</strong>
            <p>
              Native &lt;dialog&gt; frame wrapping a card.{" "}
              {args.modal
                ? "Modal: the page is inert behind the backdrop."
                : "Popover: light dismiss, the page stays interactive."}
            </p>
            <button
              class:unset
              class:x-button
              data-variant="soft"
              data-size="1"
              on:click={() => {
                const el = overlay();
                if (!el) return;
                if (el.open) el.close();
                else el.hidePopover();
              }}
            >
              Close
            </button>
          </div>
        </dialog>
      </>
    ) as Node;
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Center: Story = {};
export const BottomSheet: Story = { args: { placement: "block-end" } };
export const TopSheet: Story = { args: { placement: "block-start" } };
export const Drawer: Story = { args: { placement: "inline-end" } };
export const CornerPanel: Story = {
  args: { placement: "block-end inline-end", modal: false },
};

/**
 * `popover="manual"` keeps the panel in the top layer while the page stays
 * fully interactive (Apple Maps style). The buttons inside flip
 * `data-placement` on the open overlay — every placement is expressed in
 * interpolable lengths, so the switch morphs with a plain CSS transition.
 */
export const Morph: Story = {
  render: () => {
    const id = `overlay-story-${uid++}`;
    const overlay = signal<HTMLDialogElement | null>();
    const spots = [
      "block-end inline-end",
      "block-end",
      "center",
      "inline-end",
      "block-start inline-start",
    ];
    return (
      <>
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size="2"
          popovertarget={id}
        >
          Toggle panel
        </button>
        <dialog
          ref={(el: HTMLDialogElement) => {
            overlay(el);
            createOverlayGestures(el);
          }}
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
          data-placement="block-end inline-end"
          data-detent="medium"
        >
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Morph</strong>
            <p>Persistent panel — flip the placement while it stays open.</p>
            <div style="display: flex; flex-wrap: wrap; gap: var(--space-2)">
              {spots.map((spot) => (
                <button
                  class:unset
                  class:x-button
                  data-variant="soft"
                  data-size="1"
                  on:click={() =>
                    overlay()?.setAttribute("data-placement", spot)
                  }
                >
                  {spot}
                </button>
              ))}
            </div>
          </div>
        </dialog>
      </>
    ) as Node;
  },
};
