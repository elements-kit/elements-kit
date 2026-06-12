import type { Meta, StoryObj } from "@storybook/html-vite";
import { computed, signal } from "elements-kit/signals";
import "@/utilities/dom-lifecycle.ts";
import "../card/card.css";
import "../button/button.css";
import "../toggle/toggle.css";
import "./overlay.css";
import { constrainOverlay, createOverlayGestures } from "./gestures.ts";

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
    return (
      <>
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size="2"
          popovertarget={args.modal ? undefined : id}
          on:click={() => {
            if (args.modal) overlay()?.showModal();
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
          {/* Auto-open + gestures on mount; the onConnect effectScope
              disposes the gestures on disconnect (story re-render). */}
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              if (args.gestures) createOverlayGestures(el);
              if (args.modal) el.showModal();
              else el.showPopover();
            }}
          />
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
const GRID: { label: string; placement: string }[] = [
  { label: "↖", placement: "block-start inline-start" },
  { label: "↑", placement: "block-start" },
  { label: "↗", placement: "block-start inline-end" },
  { label: "←", placement: "inline-start" },
  { label: "●", placement: "center" },
  { label: "→", placement: "inline-end" },
  { label: "↙", placement: "block-end inline-start" },
  { label: "↓", placement: "block-end" },
  { label: "↘", placement: "block-end inline-end" },
];

export const Morph: Story = {
  argTypes: {
    // Placement is driven by the in-card grid.
    placement: { control: false },
  },
  args: { modal: false },
  render: (args) => {
    const id = `overlay-story-${uid++}`;
    const overlay = signal<HTMLDialogElement | null>();
    const placement = signal("block-end inline-end");
    return (
      <>
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size="2"
          popovertarget={args.modal ? undefined : id}
          on:click={() => {
            if (args.modal) overlay()?.showModal();
          }}
        >
          Toggle panel
        </button>
        <dialog
          ref={overlay}
          id={id}
          class:unset
          class:x-overlay
          popover={args.modal ? undefined : "manual"}
          data-placement={placement}
          data-detent={args.detent}
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              if (args.gestures) createOverlayGestures(el);
              if (args.modal) el.showModal();
              else el.showPopover();
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Morph</strong>
            <p>Persistent panel — flip the placement while it stays open.</p>
            <div
              role="radiogroup"
              aria-label="Placement"
              style="display: grid; grid-template-columns: repeat(3, max-content); gap: var(--space-1); justify-content: start"
            >
              {GRID.map((cell) => (
                <label
                  class="x-toggle"
                  data-icon
                  data-size="2"
                  title={cell.placement}
                >
                  <input
                    type="radio"
                    class:unset
                    name={`${id}-placement`}
                    aria-label={cell.placement}
                    checked={computed(() => cell.placement === placement())}
                    on:change={() => placement(cell.placement)}
                  />
                  {cell.label}
                </label>
              ))}
            </div>
          </div>
        </dialog>
      </>
    ) as Node;
  },
};

/**
 * `constrainOverlay(panel, container)` syncs the container's rect into the
 * `--overlay-constraint-*` variables: placements pin to the container's
 * edges, detents become fractions of it, and the move/resize gestures
 * clamp inside it — all geometry computed by the stylesheet.
 */
export const Constrained: Story = {
  argTypes: {
    placement: { control: false },
    modal: { control: false },
  },
  args: { modal: false },
  render: (args) => {
    const id = `overlay-story-${uid++}`;
    const overlay = signal<HTMLDialogElement | null>();
    const container = signal<HTMLElement | null>();
    const placement = signal("center");
    return (
      <>
        <div
          ref={container}
          style="position: fixed; inset: 96px 48px 48px 48px; border: 2px dashed var(--neutral-a8); border-radius: var(--radius-4)"
        />
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
          ref={overlay}
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
          data-placement={placement}
          data-detent={args.detent}
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              constrainOverlay(el, container()!);
              if (args.gestures) createOverlayGestures(el);
              el.showPopover();
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Constrained</strong>
            <p>The dashed box is the constraint — not the viewport.</p>
            <div
              role="radiogroup"
              aria-label="Placement"
              style="display: grid; grid-template-columns: repeat(3, max-content); gap: var(--space-1); justify-content: start"
            >
              {GRID.map((cell) => (
                <label
                  class="x-toggle"
                  data-icon
                  data-size="2"
                  title={cell.placement}
                >
                  <input
                    type="radio"
                    class:unset
                    name={`${id}-placement`}
                    aria-label={cell.placement}
                    checked={computed(() => cell.placement === placement())}
                    on:change={() => placement(cell.placement)}
                  />
                  {cell.label}
                </label>
              ))}
            </div>
          </div>
        </dialog>
      </>
    ) as Node;
  },
};
