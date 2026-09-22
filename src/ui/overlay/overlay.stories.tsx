import type { Meta, StoryObj } from "@storybook/html-vite";
import { batch, computed, effect, signal } from "elements-kit/signals";
import "@/utilities/dom-lifecycle.ts";
import "../card/card.css";
import "../button/button.css";
import "./index.css";
import "./overlay.css";
import {
  ElementBox,
  OverlayBox,
  MarginBox,
  PositionTry as PositionTryRegion,
  WINDOW_BOX,
  VIEWPORT_BOX,
  Align,
  Gestures,
  Motion,
  anchor_length,
  place,
  PositionArea as PositionAreaRegion,
  type Area,
  type Region,
  type ReadonlyBox,
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
      // Close once the pointer has left both the nav and the panel. The grace
      // period lets it cross the gap between them without closing.
      let closing: ReturnType<typeof setTimeout> | undefined;
      const stay = () => clearTimeout(closing);
      const leave = () => {
        closing = setTimeout(() => open(false), 120);
      };
      for (const el of [nav, panel]) {
        el.addEventListener("pointerenter", stay);
        el.addEventListener("pointerleave", leave);
      }

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
 * and `place` lands the panel on it. The offset off the anchor is the
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
                  place(overlay, new PositionAreaRegion(anchor_box, live().area));
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

/** Place `overlay` through `tried`, and outline the chosen room. */
function follow(
  overlay: OverlayBox,
  tried: PositionTryRegion,
  outline: HTMLElement,
): void {
  effect(() => {
    const { xmin: left = 0, xmax: right = innerWidth } = tried;
    const { ymin: top = 0, ymax: bottom = innerHeight } = tried;
    outline.style.left = `${left}px`;
    outline.style.top = `${top}px`;
    outline.style.width = `${Math.max(0, right - left)}px`;
    outline.style.height = `${Math.max(0, bottom - top)}px`;
    outline.style.borderColor = tried.fits ? "" : "var(--red-9, red)";
  });
  effect(() => place(overlay, tried));
}

const OUTLINE =
  "position: fixed; pointer-events: none; border: 1px dashed currentColor; opacity: 0.5";

const FALLBACKS = ["all, then the dock", "all", "below, above"] as const;

type TryOrder = PositionTryRegion["order"];

interface TryArgs {
  order: TryOrder;
  fallbacks: (typeof FALLBACKS)[number];
}

const TRY_AREAS = [
  "block-end",
  "bottom span-right",
  "bottom span-left",
  "block-start",
  "top span-right",
  "top span-left",
  "inline-end",
  "inline-start",
] as const;

/**
 * `PositionTry` over the window: drag the anchor toward an edge and the panel
 * takes the first area with room for it — below, then above, each centred
 * or, near a side edge where a centred panel has no room, spanning away from
 * it; then after, before — and with none left, the box docked at the
 * top-left. Each area is bounded by the window (its default containing
 * block); the dashed outline is the chosen one's room.
 *
 * With fewer fallbacks — no dock, or only below/above — some spots have no
 * candidate that fits: the panel keeps the first, as CSS does, `fits` turns
 * false, and the outline goes red.
 *
 * The anchor is a signal-driven box, not an `ElementBox`: a rect only
 * refreshes on resize and scroll, never on a drag.
 */
export const PositionTry: StoryObj<TryArgs> = {
  argTypes: {
    order: { control: "select", options: ["normal", "most-width", "most-height"] },
    fallbacks: { control: "select", options: FALLBACKS },
  },
  args: { order: "normal", fallbacks: FALLBACKS[0] },
  render: (() => {
    // Cached root, as in `PositionArea`, so an arg change keeps the DOM.
    let root: HTMLElement | undefined;
    const order = signal<TryOrder>("normal");
    const fallbacks = signal<TryArgs["fallbacks"]>(FALLBACKS[0]);

    return (args: TryArgs) => {
      order(args.order);
      fallbacks(args.fallbacks);
      if (root) return root;

      const id = `overlay-story-${uid++}`;
      const ax = signal(innerWidth / 2 - 50);
      const ay = signal(innerHeight / 2 - 18);
      const anchor: ReadonlyBox = {
        get x() {
          return ax();
        },
        get y() {
          return ay();
        },
        w: 100,
        h: 36,
      };
      // The gap only on the side the panel sits: a span keeps its edge flush.
      const blockGap = new MarginBox(anchor, 8, 0);
      const inlineGap = new MarginBox(anchor, 0, 8);
      const dock = { xmin: 16, xmax: 296, ymin: 16, ymax: 176, xalign: 0, yalign: 0 };
      const named = new Map<Area, string>([
        ...TRY_AREAS.map((a): [Area, string] => [
          new PositionAreaRegion(a.startsWith("inline") ? inlineGap : blockGap, a),
          a,
        ]),
        [dock, "box (dock)"],
      ]);
      const all = [...named.keys()];
      const candidates = computed((): Area[] => {
        const set = fallbacks();
        if (set === "all") return all.slice(0, -1);
        if (set === "below, above") return [all[0], all[3]];
        return all;
      });

      const drag = (e: PointerEvent) => {
        const el = e.currentTarget as HTMLElement;
        el.setPointerCapture(e.pointerId);
        const dx = e.clientX - ax();
        const dy = e.clientY - ay();
        const move = (m: PointerEvent) => {
          ax(m.clientX - dx);
          ay(m.clientY - dy);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener(
          "pointerup",
          () => el.removeEventListener("pointermove", move),
          { once: true },
        );
      };

      const chosen = signal("");
      const fits = signal(true);
      root = (
        <div>
          <button
            class:unset
            class:x-button
            data-variant="solid"
            data-size="2"
            style={`position: fixed; width: ${anchor.w}px; height: ${anchor.h}px; touch-action: none; cursor: grab`}
            style:left={computed(() => `${ax()}px`)}
            style:top={computed(() => `${ay()}px`)}
            on:pointerdown={drag}
          >
            Drag me
          </button>
          <div
            id={`${id}-room`}
            style={OUTLINE}
          />
          <dialog id={id} class:unset class:x-overlay popover="manual">
            <div class:unset class:x-card data-variant="elevated" data-size="2">
              <strong>PositionTry</strong>
              <p>{() => (fits() ? "chosen" : "none fits, kept")}: {() => chosen()}</p>
              <p>order: {() => order()}</p>
            </div>
            <dom-lifecycle
              onConnect={(self) => {
                const panel = self.parentElement as HTMLDialogElement;
                const room = document.getElementById(`${id}-room`);
                if (!room) return;
                const overlay = new OverlayBox(panel);
                const tried = new PositionTryRegion(overlay, candidates());
                panel.showPopover();

                effect(() => {
                  tried.order = order();
                });
                effect(() => {
                  tried.candidates = candidates();
                });
                effect(() => {
                  chosen(tried.chosen ? (named.get(tried.chosen) ?? "") : "");
                  fits(tried.fits);
                });
                follow(overlay, tried, room);
              }}
            />
          </dialog>
        </div>
      ) as HTMLElement;
      return root;
    };
  })(),
};

const SCROLL_AREAS = [
  ["below, in the scroller", "block-end", "scroller"],
  ["above, in the scroller", "block-start", "scroller"],
  ["below, spilling out", "block-end", "window"],
  ["above, spilling out", "block-start", "window"],
] as const;

const MODES = ["follow", "stick"] as const;

interface ScrollArgs {
  mode: (typeof MODES)[number];
}

/**
 * A menu whose anchor scrolls. Bounds per candidate: it keeps inside the
 * scroller while it can, then spills into the window — a fallback CSS cannot
 * say, since every `position-try` option shares one containing block. It
 * flips by the room left: centred, neither side of the scroller has room, so
 * it spills; scroll the anchor toward an edge and the far side does.
 *
 *   follow  the menu scrolls with the anchor, out of the scroller too
 *   stick   each area cut by its container — `area.intersect(area.container)`
 *           — so the menu stops at the container's edge
 *
 * Nothing hides: a container only limits the room, never the position.
 */
export const PositionTryScroll: StoryObj<ScrollArgs> = {
  argTypes: {
    mode: { control: "inline-radio", options: MODES },
  },
  args: { mode: "follow" },
  render: (() => {
    // Cached root, as in `PositionArea`, so an arg change keeps the DOM.
    let root: HTMLElement | undefined;
    const mode = signal<ScrollArgs["mode"]>("follow");

    return (args: ScrollArgs) => {
      mode(args.mode);
      if (root) return root;

      const id = `overlay-story-${uid++}`;
      const chosen = signal("");
      const wire = (self: HTMLElement) => {
        const scroller = self.parentElement as HTMLElement;
        const trigger = document.getElementById(`${id}-trigger`);
        const panel = document.getElementById(id) as HTMLDialogElement;
        const outline = document.getElementById(`${id}-room`);
        if (!trigger || !panel || !outline) return;

        const view = new ElementBox(scroller);
        const gap = new MarginBox(new ElementBox(trigger), 8, 0);
        const areas = SCROLL_AREAS.map(
          ([, area, bound]) =>
            new PositionAreaRegion(gap, area, bound === "window" ? WINDOW_BOX : view),
        );
        const stucks = areas.map((a) => a.intersect(a.container));
        const overlay = new OverlayBox(panel);
        const tried = new PositionTryRegion(overlay, areas);
        panel.showPopover();

        effect(() => {
          tried.candidates = mode() === "stick" ? stucks : areas;
        });
        effect(() => {
          const i = tried.chosen ? tried.candidates.indexOf(tried.chosen) : -1;
          chosen(SCROLL_AREAS[i]?.[0] ?? "");
        });
        follow(overlay, tried, outline);
        trigger.scrollIntoView({ block: "center" });
      };

      root = (
        <div>
          <div style="width: 360px; height: 260px; overflow: auto; border: 1px solid var(--neutral-6); border-radius: 8px">
            <div style="height: 900px; display: grid; place-items: center">
              <button
                class:unset
                class:x-button
                data-variant="solid"
                data-size="2"
                id={`${id}-trigger`}
              >
                Scroll me
              </button>
            </div>
            <dom-lifecycle onConnect={wire} />
          </div>
          <div id={`${id}-room`} style={OUTLINE} />
          <dialog id={id} class:unset class:x-overlay popover="manual">
            <div class:unset class:x-card data-variant="elevated" data-size="2">
              <strong>PositionTry</strong>
              <p>
                {() => mode()}: {() => chosen()}
              </p>
            </div>
          </dialog>
        </div>
      ) as HTMLElement;
      return root;
    };
  })(),
};

const SHEET_STOPS = ["peek", "half", "full"] as const;

/**
 * A bottom sheet from the existing primitives — no sheet class. Docked with an
 * area on the visual viewport (so it rides above the keyboard), sized by
 * `OverlayBox.h`, dragged through `displacement` with `Motion` for velocity,
 * `Gestures.rubber` past the top stop and `Gestures.snap` on release.
 *
 * Stops are fractions of the viewport, recomputed as it resizes. Above the
 * lowest stop a drag grows or shrinks the sheet; below it the sheet keeps its
 * height and slides down, so the content never reflows. Released low or
 * flicked down, it closes.
 */
export const BottomSheet: StoryObj = {
  render: () => {
    const id = `overlay-story-${uid++}`;
    const stop = signal(1);

    const wire = () => {
      const el = document.getElementById(id) as HTMLDialogElement;
      const opener = document.getElementById(`${id}-open`);
      if (!el || !opener) return;
      const grips = el.querySelectorAll<HTMLElement>("[data-grip]");

      const sheet = new OverlayBox(el);
      // The visual viewport's bottom edge, centred across it: live, so it
      // follows the keyboard.
      const dock = VIEWPORT_BOX.toArea(Align.center, Align.end);
      effect(() => place(sheet, dock));
      effect(() => {
        sheet.w = Math.min(VIEWPORT_BOX.w, 560);
      });

      // Heights per stop. The top one leaves headroom: a handle on the very
      // top edge can only be grabbed by dragging off the display.
      const heights = computed(() => {
        const v = VIEWPORT_BOX.h;
        return [Math.min(180, v * 0.3), v * 0.5, v * 0.9];
      });
      effect(() => {
        sheet.h = heights()[stop()]!;
      });

      opener.addEventListener("click", () => {
        // Back at half, whatever the last close left behind.
        batch(() => {
          sheet.displacement.clear();
          stop(1);
        });
        el.showModal();
      });
      // A click on the dialog itself is the backdrop.
      el.addEventListener("click", (e) => {
        if (e.target === el) el.close();
      });

      const motion = new Motion();
      let pointer: number | undefined;
      /** When the last move landed: a held pointer releases with no fling. */
      let moved = 0;

      /** The height the finger asks for, unconstrained. */
      const asked = () => heights()[stop()]! - motion.displacement;

      const drag = (e: PointerEvent) => {
        if (e.pointerId !== pointer) return;
        motion.value = e.clientY;
        moved = e.timeStamp;
        const [low, , high] = heights();
        const h = asked();
        const settled = heights()[stop()]!;
        batch(() => {
          // Above the lowest stop: resize, resisting past the top one.
          // Below it: keep the height and slide down instead.
          const resist = Gestures.rubber(low!, high!, VIEWPORT_BOX.h);
          sheet.displacement.h = Math.max(resist(h), low!) - settled;
          sheet.displacement.y = Math.max(0, low! - h);
        });
      };

      const release = (e: PointerEvent, cancelled = false) => {
        if (e.pointerId !== pointer) return;
        pointer = undefined;
        const stale = e.timeStamp - moved > 100;
        // clientY falls as the height rises: the velocity flips sign.
        const target = cancelled
          ? heights()[stop()]!
          : Gestures.snap(asked(), stale ? 0 : -motion.velocity, [0, ...heights()]);
        // Thaw first, or the sheet jumps to the stop instead of gliding.
        el.toggleAttribute("data-no-transition", false);
        if (target === 0) {
          // Keep the offset: the exit slide continues from where it is.
          el.close();
          return;
        }
        batch(() => {
          sheet.displacement.clear();
          stop(heights().indexOf(target));
        });
      };

      for (const grip of grips) {
        grip.addEventListener("pointerdown", (e) => {
          if (pointer !== undefined || !e.isPrimary) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          pointer = e.pointerId;
          grip.setPointerCapture(e.pointerId);
          el.toggleAttribute("data-no-transition", true);
          moved = e.timeStamp;
          motion.abort(e.clientY);
        });
        grip.addEventListener("pointermove", drag);
        grip.addEventListener("pointerup", (e) => release(e));
        grip.addEventListener("pointercancel", (e) => release(e, true));
        grip.addEventListener("lostpointercapture", (e) => release(e, true));
      }
    };

    return (
      <div>
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size="2"
          id={`${id}-open`}
        >
          Open sheet
        </button>
        <dom-lifecycle onConnect={wire} />
        <dialog id={id} class:unset class:x-overlay>
          <div class:unset class:x-handle data-placement="block-start" data-grip />
          <div
            class:unset
            class:x-card
            data-variant="elevated"
            data-size="2"
            style="display: flex; flex-direction: column; border-end-start-radius: 0; border-end-end-radius: 0; padding-bottom: env(safe-area-inset-bottom)"
          >
            <header data-grip style="touch-action: none; cursor: grab; padding-block: var(--space-2)">
              <strong>Sheet</strong> · {() => SHEET_STOPS[stop()]}
            </header>
            <div style="flex: 1 1 auto; overflow: auto; min-height: 0">
              <p>Drag the handle or the header. Flick up for full, down to close.</p>
              {Array.from({ length: 12 }, (_, i) => (
                <p>
                  Paragraph {i + 1}. The content scrolls inside the sheet; it never
                  reflows while the sheet slides below its lowest stop.
                </p>
              ))}
            </div>
          </div>
        </dialog>
      </div>
    );
  },
};
