import type { Meta, StoryObj } from "@storybook/html-vite";
import { computed, effectScope, signal } from "elements-kit/signals";
import "@/utilities/dom-lifecycle.ts";
import "../card/card.css";
import "../button/button.css";
import "../toggle/toggle.css";
import "./index.css";
import "./overlay.css";
import { Anchor, Overlay, SnapSession } from "./index.ts";

const RESIZES = [
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

interface Args {
  resize: (typeof RESIZES)[number];
  draggable: boolean;
  x: string;
  y: string;
  w: string;
  h: string;
  modal: boolean;
  gestures: boolean;
}

let uid = 0;

/** Inline style string feeding the public geometry channels. */
function channelStyle(args: Pick<Args, "x" | "y" | "w" | "h">): string {
  return [
    args.x && `--overlay-x: ${args.x}`,
    args.y && `--overlay-y: ${args.y}`,
    args.w && `--overlay-w: ${args.w}`,
    args.h && `--overlay-h: ${args.h}`,
  ]
    .filter(Boolean)
    .join("; ");
}

const meta = {
  title: "UI/Overlay",
  // Not production ready — surfaces an "Experimental" sidebar badge + a canvas
  // banner (see .storybook/manager.ts renderLabel and preview.ts decorator).
  tags: ["experimental"],
  argTypes: {
    resize: {
      control: "select",
      options: [...RESIZES],
      description:
        "data-resize — the side the resize handle sits on; a start/end pair (block first) for a corner grip",
    },
    draggable: {
      control: "boolean",
      description: "data-draggable — x/y move gesture from the top strip",
    },
    x: {
      control: "text",
      description:
        "--overlay-x — center's distance from the constraint's left (empty = centered; 9999px docks right)",
    },
    y: {
      control: "text",
      description:
        "--overlay-y — center's distance from the constraint's top (empty = centered; 9999px docks bottom)",
    },
    w: {
      control: "text",
      description: "--overlay-w — width channel (empty = --overlay-width, 480px)",
    },
    h: {
      control: "text",
      description: "--overlay-h — height channel (empty = fit-content)",
    },
    modal: {
      control: "boolean",
      description:
        "Open with showModal() (backdrop, inert page) instead of popover (light dismiss, page interactive)",
    },
    gestures: {
      control: "boolean",
      description:
        "Attach new Overlay(el) — resize from edge/corner handles, move when draggable, flick to dismiss",
    },
  },
  args: {
    resize: "end-end",
    draggable: true,
    x: "",
    y: "",
    w: "",
    h: "",
    modal: true,
    gestures: true,
  },
  render: (args) => {
    const id = `overlay-story-${uid++}`;
    const panel = signal<HTMLDialogElement | null>();
    return (
      <>
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size="2"
          popovertarget={args.modal ? undefined : id}
          on:click={() => {
            if (args.modal) panel()?.showModal();
          }}
        >
          Open overlay
        </button>
        <dialog
          ref={panel}
          id={id}
          class:unset
          class:x-overlay
          popover={args.modal ? undefined : "auto"}
          data-resize={args.resize === "none" ? undefined : args.resize}
          data-draggable={args.draggable ? "" : undefined}
          style={channelStyle(args)}
        >
          {/* Auto-open + gestures on mount; the onConnect effectScope
              disposes the gestures on disconnect (story re-render). */}
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              if (args.gestures) new Overlay(el);
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
                const el = panel();
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
    );
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

/** Centered window: move from the top strip, corner grip resize. */
export const Window: Story = {};

/**
 * Bottom sheet with SNAPPING — the markup gestures drive the drag (the
 * `data-resize="block-start"` pill affordance is overlay.css's
 * `::before`), and a one-line `Overlay` subclass swaps the gesture
 * physics: `gestureSession()` returns a `SnapSession`, so the height
 * rests on 25 / 60 / 90% of the constraint, velocity-projected; a flick
 * past the smallest stop dismisses.
 */
export const BottomSheet: Story = {
  argTypes: {
    resize: { control: false },
    draggable: { control: false },
    x: { control: false },
    y: { control: false },
    w: { control: false },
    h: { control: false },
    modal: { control: false },
    gestures: { control: false },
  },
  args: { resize: "none", draggable: false, modal: false, gestures: false },
  render: () => {
    const id = `overlay-story-${uid++}`;
    class SheetOverlay extends Overlay {
      protected override gestureSession() {
        return new SnapSession([0.25, 0.6, 0.9]);
      }
    }
    return (
      <>
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size="2"
          popovertarget={id}
        >
          Open sheet
        </button>
        <dialog
          id={id}
          class:unset
          class:x-overlay
          popover="auto"
          data-resize="block-start"
          style="--overlay-y: 9999px; --overlay-h: 60svh; --overlay-w: var(--overlay-constraint-width)"
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              new SheetOverlay(el);
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Bottom sheet</strong>
            <p>
              Drag the top pill — the height snaps to 25 / 60 / 90% of the
              viewport. Flick down past the smallest stop to dismiss.
            </p>
          </div>
        </dialog>
      </>
    );
  },
};

export const TopSheet: Story = {
  args: {
    resize: "block-end",
    draggable: false,
    y: "-9999px",
    w: "var(--overlay-constraint-width)",
    h: "60svh",
  },
};

/** Right drawer: docked at the inline end, width drag from the inner
 * handle. */
export const Drawer: Story = {
  args: {
    resize: "inline-start",
    draggable: false,
    x: "9999px",
    w: "480px",
    h: "var(--overlay-constraint-height)",
  },
};

/** Floating panel docked at the bottom-right corner — saturated x/y, a
 * corner grip facing inward (top-left), persistent popover. */
export const CornerPanel: Story = {
  args: {
    resize: "start-start",
    x: "9999px",
    y: "9999px",
    h: "60svh",
    modal: false,
  },
};

const FULL_W = "var(--overlay-constraint-width)";
const FULL_H = "var(--overlay-constraint-height)";

/**
 * The in-card 3×3 grid — each arrow is a full recipe (location point +
 * resize handle + size channels), so clicking one morphs the panel into
 * a distinct shape:
 *   edges  → full-width sheets / full-height drawers (handle on the
 *            non-docked side, so the drag grows from the dock)
 *   center → a free-resize window
 *   corners→ docked panels whose corner grip faces inward (the opposite,
 *            docked corner stays anchored)
 * Every length is interpolable, so each switch morphs with a plain CSS
 * transition.
 */
interface Cell {
  label: string;
  x: string;
  y: string;
  resize: string;
  w: string;
  h: string;
}

const GRID: Cell[] = [
  { label: "↖", x: "-9999px", y: "-9999px", resize: "end-end", w: "", h: "" },
  { label: "↑", x: "", y: "-9999px", resize: "block-end", w: FULL_W, h: "" },
  { label: "↗", x: "9999px", y: "-9999px", resize: "end-start", w: "", h: "" },
  { label: "←", x: "-9999px", y: "", resize: "inline-end", w: "", h: FULL_H },
  { label: "●", x: "", y: "", resize: "end-end", w: "", h: "" },
  { label: "→", x: "9999px", y: "", resize: "inline-start", w: "", h: FULL_H },
  { label: "↙", x: "-9999px", y: "9999px", resize: "start-end", w: "", h: "" },
  { label: "↓", x: "", y: "9999px", resize: "block-start", w: FULL_W, h: "" },
  { label: "↘", x: "9999px", y: "9999px", resize: "start-start", w: "", h: "" },
];

/** The center window — the mount default both morph stories start on. */
const CENTER = GRID[4];

/**
 * Applies a grid cell's full recipe to the live overlay element. Writes
 * are imperative — a reactive `style` attribute would replace the whole
 * attribute and wipe the constraint vars / gesture-persisted channels.
 */
function applyCell(el: HTMLDialogElement | null | undefined, cell: Cell) {
  if (!el) return;
  for (const [name, value] of [
    ["--overlay-x", cell.x],
    ["--overlay-y", cell.y],
    ["--overlay-w", cell.w],
    ["--overlay-h", cell.h],
  ] as const) {
    if (value) el.style.setProperty(name, value);
    else el.style.removeProperty(name);
  }
  if (cell.resize) el.setAttribute("data-resize", cell.resize);
  else el.removeAttribute("data-resize");
}

/** The grid cell matching an authored shape, or `""` (no arrow lit). */
function matchCell(shape: {
  resize: string;
  x: string;
  y: string;
  w: string;
  h: string;
}): string {
  const resize = shape.resize === "none" ? "" : shape.resize;
  return (
    GRID.find(
      (c) =>
        c.resize === resize &&
        c.x === shape.x &&
        c.y === shape.y &&
        c.w === shape.w &&
        c.h === shape.h,
    )?.label ?? ""
  );
}

/**
 * `popover="manual"` keeps the panel in the top layer while the page stays
 * fully interactive (Apple Maps style). The buttons inside morph the open
 * overlay between shapes — sheet, drawer, window, corner panel — by
 * flipping the location point, the resize handle, and the size channels.
 * Every length is interpolable, so each switch animates with a plain CSS
 * transition.
 */
export const Morph: Story = {
  argTypes: {
    // Location, resize, and size are driven by the in-card grid.
    resize: { control: false },
    x: { control: false },
    y: { control: false },
    w: { control: false },
    h: { control: false },
  },
  args: { modal: false, draggable: false },
  render: (args) => {
    const id = `overlay-story-${uid++}`;
    const panel = signal<HTMLDialogElement | null>();
    const selected = signal(CENTER.label);
    const moveTo = (cell: Cell) => {
      selected(cell.label);
      applyCell(panel(), cell);
    };
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
          ref={panel}
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
          data-resize={CENTER.resize}
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              if (args.gestures) new Overlay(el);
              el.showPopover();
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Morph</strong>
            <p>Persistent panel — morph it between shapes while it stays open.</p>
            <div
              role="radiogroup"
              aria-label="Shape"
              style="display: grid; grid-template-columns: repeat(3, max-content); gap: var(--space-1); justify-content: start"
            >
              {GRID.map((cell) => (
                <label class="x-toggle" data-icon data-size="2" title={cell.resize}>
                  <input
                    type="radio"
                    class:unset
                    name={`${id}-shape`}
                    aria-label={cell.label}
                    checked={computed(() => cell.label === selected())}
                    on:change={() => moveTo(cell)}
                  />
                  {cell.label}
                </label>
              ))}
            </div>
          </div>
        </dialog>
      </>
    );
  },
};

const AREAS = [
  "block-end",
  "block-start",
  "inline-end",
  "inline-start",
  "block-end span-inline-end",
  "block-end span-inline-start",
  "block-start span-inline-end",
  "inline-end span-block-start",
  "inline-start span-block-end",
] as const;

type AnchoredArgs = Args & { area: (typeof AREAS)[number]; arrow: boolean };

const ANCHORED_CONTROLS = {
  resize: { control: false },
  draggable: { control: false },
  x: { control: false },
  y: { control: false },
  w: { control: false },
  h: { control: false },
  modal: { control: false },
  gestures: { control: false },
} as const;

/**
 * `new Anchor(trigger)` — the popover follows its anchor element,
 * which follows whichever trigger you click. A reactive (getter) target
 * uses the Floating UI engine so a re-pin morphs to its destination in
 * one interpolation — flip included (native placement would flip
 * mid-glide: a visible jump). Static element targets stay compositor-
 * side where CSS anchor positioning exists.
 */
export const Anchored: StoryObj<AnchoredArgs> = {
  argTypes: {
    area: {
      control: "select",
      options: [...AREAS],
      description:
        "--overlay-area — the position-area region the popover occupies relative to its trigger",
    },
    arrow: {
      control: "boolean",
      description:
        "new Anchor(…, { arrow: true }) — caret pointing at the trigger (Floating UI engine)",
    },
    ...ANCHORED_CONTROLS,
  },
  args: {
    area: "block-end",
    arrow: false,
    resize: "none",
    draggable: false,
    modal: false,
    gestures: false,
  },
  render: (args) => {
    const id = `overlay-story-${uid++}`;
    const panel = signal<HTMLDialogElement | null>();
    // ONE anchor for the story's life; clicking a trigger re-points the
    // reactive follow — the open popover morphs there instead of closing.
    const target = signal<Element | null>(null);
    const wire = (ev: Event) => {
      const el = panel();
      if (!el) return;
      target(ev.currentTarget as Element);
      if (!el.matches(":popover-open")) el.showPopover();
    };
    const trigger = (inset: string, label: string) => (
      <button
        class:unset
        class:x-button
        data-variant="solid"
        data-size="2"
        on:click={wire}
        style={`position: fixed; ${inset}`}
      >
        {label}
      </button>
    );
    return (
      <>
        {trigger("top: 96px; left: 48px", "Top start")}
        {trigger("top: 96px; right: 48px", "Top end")}
        {trigger("top: 50%; left: 50%; translate: -50% -50%", "Center")}
        {trigger("bottom: 48px; left: 48px", "Bottom start")}
        {trigger("bottom: 48px; right: 48px", "Bottom end")}
        <dialog
          ref={panel}
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
          style={`--overlay-area: ${args.area}; --overlay-w: 260px`}
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              new Overlay(el, {
                anchor: new Anchor(
                  () => target() ?? undefined,
                  args.arrow ? { arrow: true } : undefined,
                ),
              });
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Anchored</strong>
            <p>
              Opens in the <code>{args.area}</code> region of the clicked
              trigger — click another trigger and it morphs there; edge
              triggers flip instead of overflowing.
            </p>
            <button
              class:unset
              class:x-button
              data-variant="soft"
              data-size="1"
              on:click={() => panel()?.hidePopover()}
            >
              Close
            </button>
          </div>
        </dialog>
      </>
    );
  },
};

/**
 * Tear-off: `new Overlay(el, { anchor })` + `data-draggable` — the panel follows its
 * trigger until you drag it (the pointer moves the ANCHOR, the panel
 * follows; the overlay never changes state). The drag rubber-bands at
 * the viewport edges; reopening re-pins to the trigger.
 */
export const TearOff: StoryObj<Args> = {
  argTypes: ANCHORED_CONTROLS,
  args: { resize: "none", draggable: false, modal: false, gestures: false },
  render: () => {
    const id = `overlay-story-${uid++}`;
    return (
      <>
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size="2"
          popovertarget={id}
          style="position: fixed; top: 96px; left: 48px"
        >
          Open panel
        </button>
        <dialog
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
          data-draggable
          style="--overlay-w: 280px"
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              const trigger = document.querySelector(
                `[popovertarget="${id}"]`,
              )!;
              new Overlay(el, { anchor: new Anchor(trigger) });
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Tear-off</strong>
            <p>
              Anchored to its trigger — drag this card anywhere (the drag
              moves the anchor). Close and reopen to re-pin.
            </p>
            <button
              class:unset
              class:x-button
              data-variant="soft"
              data-size="1"
              popovertarget={id}
            >
              Close
            </button>
          </div>
        </dialog>
      </>
    );
  },
};

/**
 * `within` — one option, both constraints: `new Overlay(el, { anchor, within })`
 * constrains the overlay to the dashed container (size caps, location
 * clamps) AND flips/shifts at ITS edges instead of the viewport's
 * (Floating UI engine in every browser — native CSS anchor positioning
 * has no boundary control).
 */
export const AnchoredWithin: StoryObj<AnchoredArgs> = {
  argTypes: {
    area: {
      control: "select",
      options: [...AREAS],
      description: "--overlay-area — the preferred region",
    },
    arrow: { control: "boolean" },
    ...ANCHORED_CONTROLS,
  },
  args: {
    area: "block-end",
    arrow: true,
    resize: "none",
    draggable: false,
    modal: false,
    gestures: false,
  },
  render: (args) => {
    const id = `overlay-story-${uid++}`;
    const container = signal<HTMLElement | null>();
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
          style="position: fixed; bottom: 64px; right: 64px"
        >
          Open near the corner
        </button>
        <dialog
          id={id}
          class:unset
          class:x-overlay
          popover="auto"
          style={`--overlay-area: ${args.area}; --overlay-w: 260px`}
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              new Overlay(el, {
                anchor: new Anchor(
                  document.querySelector(`[popovertarget="${id}"]`)!,
                  { arrow: args.arrow },
                ),
                within: container()!,
              });
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Within</strong>
            <p>
              Flips and shifts at the dashed container's edges — not the
              viewport's.
            </p>
          </div>
        </dialog>
      </>
    );
  },
};

/**
 * The Base UI nav-popover pattern: one popover shared by a nav of
 * triggers. Clicking another trigger re-anchors while open — the first
 * write of the new bind animates, so the popup slides and resizes to
 * the new trigger; enter/exit scales from the anchor's side
 * (`data-placed` → `transform-origin`). The caret keeps the Floating UI
 * engine driving in every browser, so the morph is uniform.
 */
export const AnimatedPopover: StoryObj<Args> = {
  argTypes: ANCHORED_CONTROLS,
  args: { resize: "none", draggable: false, modal: false, gestures: false },
  render: () => {
    const id = `overlay-story-${uid++}`;
    const panel = signal<HTMLDialogElement | null>();
    const content = signal<HTMLElement | null>();
    const active = signal("Products");
    const target = signal<Element | null>(null);
    const PANELS: Record<string, string> = {
      Products: "Design primitives, overlays, and reactive utilities.",
      Solutions: "Recipes for sheets, drawers, menus, and windows.",
      Pricing: "Free and open source — the best kind of pricing.",
      About: "A tiny reactive UI kit built on the platform.",
    };
    const ITEMS = Object.keys(PANELS);
    // ONE anchor, reactive follow — clicking another item re-points it
    // and the popup GLIDES there (no scope swap, no reopen). No
    // popovertarget: a toggle would close the open popover instead.
    const wire = (ev: Event) => {
      const el = panel();
      if (!el) return;
      const trigger = ev.currentTarget as HTMLButtonElement;
      const label = trigger.textContent ?? "";
      const open = el.matches(":popover-open");
      const switching = open && active() !== label;
      const host = content();
      // The Base UI Viewport effect: the previous panel (a ghost clone)
      // slides out toward the old item, the new one slides in from the
      // new item's direction; opacity crosses at half duration.
      let ghost: HTMLElement | null = null;
      let dir = 1;
      if (switching && host) {
        dir = ITEMS.indexOf(label) > ITEMS.indexOf(active()) ? 1 : -1;
        ghost = host.cloneNode(true) as HTMLElement;
        Object.assign(ghost.style, { position: "absolute", inset: "0" });
      }
      active(label);
      target(trigger);
      if (!open) {
        el.showPopover();
        return;
      }
      if (switching && host && ghost) {
        host.parentElement?.append(ghost);
        const timing = {
          duration: 300,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        };
        ghost
          .animate(
            [
              { translate: "0 0", opacity: 1 },
              { opacity: 0, offset: 0.5 },
              { translate: `${dir * -50}% 0`, opacity: 0 },
            ],
            timing,
          )
          .finished.finally(() => ghost.remove());
        host.animate(
          [
            { translate: `${dir * 50}% 0`, opacity: 0 },
            { opacity: 1, offset: 0.5 },
            { translate: "0 0", opacity: 1 },
          ],
          timing,
        );
      }
    };
    const item = (label: string) => (
      <button
        class:unset
        class:x-button
        data-variant="soft"
        data-size="2"
        on:click={wire}
      >
        {label}
      </button>
    );
    return (
      <>
        <nav style="position: fixed; top: 96px; left: 50%; translate: -50%; display: flex; gap: var(--space-2)">
          {item("Products")}
          {item("Solutions")}
          {item("Pricing")}
          {item("About")}
        </nav>
        <dialog
          ref={panel}
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
          style="--overlay-w: 260px"
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              new Overlay(el, { anchor: new Anchor(() => target() ?? undefined, { arrow: true }) });
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            {/* The Base UI Viewport: clips at the CARD edge (negative
                margin bleeds over the padding), each panel carries the
                padding itself — so content slides beneath it. */}
            <div style="position: relative; overflow: clip; margin: calc(-1 * var(--card-padding)) calc(-1 * var(--card-padding)) 0">
              <div ref={content} style="padding: var(--card-padding) var(--card-padding) var(--space-2)">
                <strong>{() => active()}</strong>
                <p>{() => PANELS[active()]}</p>
              </div>
            </div>
            <button
              class:unset
              class:x-button
              data-variant="soft"
              data-size="1"
              on:click={() => panel()?.hidePopover()}
            >
              Close
            </button>
          </div>
        </dialog>
      </>
    );
  },
};

/**
 * `new Overlay(panel, { within: container })` syncs the container's rect into
 * the `--overlay-constraint-*` variables: the location point clamps to the
 * container's edges and the move/resize gestures bound inside it — all
 * geometry computed by the stylesheet.
 */
export const Constrained: Story = {
  argTypes: {
    // The shape controls author the starting shape; the in-card grid
    // overrides it live.
    modal: { control: false },
  },
  args: { modal: false },
  render: (args) => {
    const id = `overlay-story-${uid++}`;
    const panel = signal<HTMLDialogElement | null>();
    const container = signal<HTMLElement | null>();
    const selected = signal(matchCell(args));
    const moveTo = (cell: Cell) => {
      selected(cell.label);
      applyCell(panel(), cell);
    };
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
          ref={panel}
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
          data-resize={args.resize === "none" ? undefined : args.resize}
          data-draggable={args.draggable ? "" : undefined}
          style={channelStyle(args)}
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              new Overlay(el, { within: container()! });
              el.showPopover();
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Constrained</strong>
            <p>The dashed box is the constraint — not the viewport.</p>
            <div
              role="radiogroup"
              aria-label="Shape"
              style="display: grid; grid-template-columns: repeat(3, max-content); gap: var(--space-1); justify-content: start"
            >
              {GRID.map((cell) => (
                <label class="x-toggle" data-icon data-size="2" title={cell.resize}>
                  <input
                    type="radio"
                    class:unset
                    name={`${id}-shape`}
                    aria-label={cell.label}
                    checked={computed(() => cell.label === selected())}
                    on:change={() => moveTo(cell)}
                  />
                  {cell.label}
                </label>
              ))}
            </div>
          </div>
        </dialog>
      </>
    );
  },
};

/**
 * Every archetype as a recipe on ONE persistent overlay — menu, popover,
 * sheet, drawer, window, corner panel. A recipe is a primitive
 * composition (anchor / channels / gestures) swapped under an
 * `effectScope`; every length is interpolable, so each switch morphs.
 * The anchored recipes use the caret (Floating UI engine), so anchored ↔
 * free transitions are channel morphs too. Modality is the one
 * non-morph: popover ↔ `showModal()` re-enters the top layer, so the
 * Modal recipe visibly reopens.
 */
export const MorphGallery: StoryObj<Args> = {
  argTypes: {
    resize: { control: false },
    draggable: { control: false },
    x: { control: false },
    y: { control: false },
    w: { control: false },
    h: { control: false },
    modal: { control: false },
    gestures: { control: false },
  },
  args: { resize: "none", draggable: false, modal: false, gestures: false },
  render: () => {
    const id = `overlay-story-${uid++}`;
    const panel = signal<HTMLDialogElement | null>();
    const selected = signal("Window");
    let stop: (() => void) | null = null;

    const CHANNELS = ["--overlay-x", "--overlay-y", "--overlay-w", "--overlay-h", "--overlay-area"];
    const reset = (el: HTMLDialogElement) => {
      stop?.();
      stop = null;
      for (const name of CHANNELS) el.style.removeProperty(name);
      el.removeAttribute("data-resize");
      el.removeAttribute("data-draggable");
    };
    const setChannels = (el: HTMLDialogElement, channels: Record<string, string>) => {
      for (const [name, value] of Object.entries(channels))
        el.style.setProperty(name, value);
    };

    const recipes: Record<string, (el: HTMLDialogElement, trigger: Element) => void> = {
      Menu: (el, trigger) => {
        setChannels(el, { "--overlay-area": "block-end span-inline-end", "--overlay-w": "220px" });
        stop = effectScope(() => void new Overlay(el, { anchor: new Anchor(trigger, { arrow: true }) }));
      },
      Popover: (el, trigger) => {
        setChannels(el, { "--overlay-area": "block-end", "--overlay-w": "300px" });
        stop = effectScope(() => void new Overlay(el, { anchor: new Anchor(trigger, { arrow: true }) }));
      },
      Sheet: (el) => {
        setChannels(el, { "--overlay-y": "9999px", "--overlay-w": "var(--overlay-constraint-width)", "--overlay-h": "45svh" });
        el.setAttribute("data-resize", "block-start");
        stop = effectScope(() => void new Overlay(el));
      },
      Drawer: (el) => {
        setChannels(el, { "--overlay-x": "9999px", "--overlay-w": "320px", "--overlay-h": "var(--overlay-constraint-height)" });
        el.setAttribute("data-resize", "inline-start");
        stop = effectScope(() => void new Overlay(el));
      },
      Window: (el) => {
        el.setAttribute("data-resize", "end-end");
        el.setAttribute("data-draggable", "");
        stop = effectScope(() => void new Overlay(el));
      },
      Corner: (el) => {
        setChannels(el, { "--overlay-x": "9999px", "--overlay-y": "9999px", "--overlay-w": "300px", "--overlay-h": "40svh" });
        el.setAttribute("data-resize", "start-start");
        stop = effectScope(() => void new Overlay(el));
      },
    };

    const apply = (ev: Event) => {
      const el = panel();
      if (!el) return;
      const trigger = ev.currentTarget as HTMLButtonElement;
      const name = trigger.textContent ?? "";
      selected(name);
      reset(el);
      if (name === "Modal") {
        // Modality is an opening mode, not geometry — it can't morph.
        // Re-enter the top layer as a modal; Close returns to popover.
        el.hidePopover();
        el.showModal();
        return;
      }
      if (!el.matches(":popover-open")) {
        if (el.open) el.close();
        el.showPopover();
      }
      recipes[name]?.(el, trigger);
    };

    const item = (label: string) => (
      <button
        class:unset
        class:x-button
        data-variant="soft"
        data-size="2"
        on:click={apply}
      >
        {label}
      </button>
    );

    return (
      <>
        <nav style="position: fixed; top: 96px; left: 50%; translate: -50%; display: flex; gap: var(--space-2); z-index: 1">
          {item("Menu")}
          {item("Popover")}
          {item("Sheet")}
          {item("Drawer")}
          {item("Window")}
          {item("Corner")}
          {item("Modal")}
        </nav>
        <dialog
          ref={panel}
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              el.showPopover();
              recipes.Window(el, el);
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>{() => selected()}</strong>
            <p>
              One overlay, six shapes — pick a recipe above and watch it
              morph. Modal is the one switch that reopens (modality is not
              geometry).
            </p>
            <button
              class:unset
              class:x-button
              data-variant="soft"
              data-size="1"
              on:click={() => {
                const el = panel();
                if (el?.open) {
                  el.close();
                  el.showPopover();
                  selected("Window");
                  reset(el);
                  recipes.Window(el, el);
                }
              }}
            >
              Close
            </button>
          </div>
        </dialog>
      </>
    );
  },
};
