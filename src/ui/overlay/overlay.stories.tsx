import type { Meta, StoryObj } from "@storybook/html-vite";
import { effect, signal } from "elements-kit/signals";
import "@/utilities/dom-lifecycle.ts";
import "../card/card.css";
import "../button/button.css";
import "./index.css";
import "./overlay.css";
import {
  ElementBox,
  OverlayBox,
  anchor_length,
  PositionArea as PositionAreaRegion,
} from "./index.ts";

/**
 * Reduced to the surface that currently exists: `OverlayBox` (geometry
 * projected to CSS), `ElementBox` (an element's live rect), and the
 * `anchor()` vocabulary. The gesture, constraint and `Overlay` stories are in
 * git history — restore them when those modules are re-exported.
 */
const meta = {
  title: "UI/Overlay",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;

const ITEMS = ["Products", "Solutions", "Pricing", "About"];
const COPY: Record<string, string> = {
  Products: "Design primitives, overlays, and reactive utilities.",
  Solutions: "Recipes for sheets, drawers, menus, and windows.",
  Pricing: "Free and open source — the best kind of pricing.",
  About: "A tiny reactive UI kit built on the platform.",
};

let uid = 0;

/**
 * One popover shared by a nav of triggers. Hovering another trigger re-points
 * the anchor while the panel stays open, so it GLIDES — `OverlayBox` writes
 * `--x/--y` into a single `translate`, and one CSS transition interpolates the
 * move. `showPopover({ source })` (never `popovertarget`, which would toggle
 * an open popover shut).
 */
export const NavPopover: StoryObj = {
  render: () => {
    const id = `overlay-story-${uid++}`;
    const active = signal(ITEMS[0]);

    const wire = (self: HTMLElement) => {
      const nav = self.parentElement as HTMLElement;
      const panel = document.getElementById(id) as HTMLDialogElement;
      const links = nav.querySelectorAll<HTMLElement>("button[data-item]");
      const first = links[0];
      if (!panel || !first) return;

      const anchor = signal<HTMLElement>(first);
      const open = signal(false);

      for (const link of links) {
        link.addEventListener("pointerenter", () => {
          active(link.dataset.item ?? "");
          anchor(link);
          open(true);
        });
      }
      nav.addEventListener("pointerleave", () => open(false));

      const overlay = new OverlayBox(panel);
      const anchor_box = new ElementBox(anchor);

      effect(() => {
        const showing = panel.matches(":popover-open");
        if (open() && !showing) panel.showPopover({ source: anchor() });
        else if (!open() && showing) panel.hidePopover();
      });

      effect(() => {
        if (!open()) return;
        // `overlay.w` is 0 on the run that opens the panel — a closed popover
        // is `display: none` and the ResizeObserver has not delivered yet.
        // Reading it still subscribes, so a later content resize re-centres.
        const self_w = overlay.w || panel.getBoundingClientRect().width;
        overlay.y = anchor_length(anchor_box, "top", "bottom") + 8;
        overlay.x = anchor_length(anchor_box, "left", "center") - self_w / 2;
      });
    };

    return (
      <>
        <nav style="display: flex; gap: var(--space-2)">
          {ITEMS.map((label) => (
            <button
              class:unset
              class:x-button
              data-variant="soft"
              data-size="2"
              data-item={label}
            >
              {label}
            </button>
          ))}
          <dom-lifecycle onConnect={wire} />
        </nav>
        <dialog id={id} class:unset class:x-overlay popover="manual">
          <div class:unset class:x-card data-variant="elevated" data-size="2">
            <strong>{() => active()}</strong>
            <p>{() => COPY[active()]}</p>
          </div>
        </dialog>
      </>
    );
  },
};

const AREAS = [
  "block-start",
  "block-end",
  "inline-start",
  "inline-end",
  "block-end span-inline-end",
] as const;

interface AreaArgs {
  area: (typeof AREAS)[number];
}

/**
 * The same anchoring through `PositionArea` — a live region of the anchor,
 * and `place` aligns the panel inside it. The offset off the anchor is the
 * panel's own `margin`, as in CSS.
 *
 * Changing an arg re-runs `render`, and Storybook's HTML renderer wipes the
 * canvas whenever the returned node differs from the one already mounted
 * (`canvasElement.innerHTML = ""`). A rebuilt panel has no previous `--x/--y`
 * to transition from, so the move would jump. Returning ONE cached element
 * hits the renderer's early-out, the DOM survives, and the args flow in
 * through a signal — so the box morphs to the new area instead of popping.
 */
export const PositionArea: StoryObj<AreaArgs> = {
  argTypes: {
    area: { control: "select", options: AREAS },
  },
  args: { area: "block-end" },
  render: (() => {
    // Per-story state, created once. `render` runs on every arg change.
    let root: HTMLElement | undefined;
    const live = signal<AreaArgs>({ area: "block-end" });

    return (args: AreaArgs) => {
      live({ ...args });
      if (root) return root;

      const id = `overlay-story-${uid++}`;
      root = (
        <div style="display: grid; place-items: center; min-height: 240px">
          <button
            class:unset
            class:x-button
            data-variant="solid"
            data-size="2"
            id={`${id}-trigger`}
          >
            Anchor
          </button>
          <dialog id={id} class:unset class:x-overlay popover="manual">
            <div class:unset class:x-card data-variant="elevated" data-size="2">
              <strong>PositionArea</strong>
              <p>area: {() => live().area}</p>
            </div>
            <dom-lifecycle
              onConnect={(self) => {
                const panel = self.parentElement as HTMLDialogElement;
                const trigger = document.getElementById(`${id}-trigger`);
                if (!trigger) return;
                const overlay = new OverlayBox(panel);
                const anchor_box = new ElementBox(trigger);
                panel.showPopover();
                effect(() => {
                  const { area } = live();
                  if (overlay.w <= 0 || overlay.h <= 0) return;

                  const region = new PositionAreaRegion(anchor_box, area);
                  const { x, y } = region.place(overlay);
                  overlay.x = x;
                  overlay.y = y;
                });
              }}
            />
          </dialog>
        </div>
      ) as HTMLElement;
      return root;
    };
  })(),
};
