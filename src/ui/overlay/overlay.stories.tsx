import type { Meta, StoryObj } from "@storybook/html-vite";
import { computed, signal } from "elements-kit/signals";
import "@/utilities/dom-lifecycle.ts";
import "../card/card.css";
import "../button/button.css";
import "../toggle/toggle.css";
import "./index.css";
import "./overlay.css";
import {
  anchorOverlay,
  constrainOverlay,
  createOverlayGestures,
  detents,
  type OverlayAnchor,
} from "./index.ts";

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
  snap: boolean;
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
    snap: {
      control: "boolean",
      description:
        "Pass detents([0.25, 0.6, 0.9]) so the resize snaps to fractions of the constraint axis instead of free resize",
    },
    modal: {
      control: "boolean",
      description:
        "Open with showModal() (backdrop, inert page) instead of popover (light dismiss, page interactive)",
    },
    gestures: {
      control: "boolean",
      description:
        "Attach createOverlayGestures — resize from edge/corner handles, move when draggable, flick to dismiss",
    },
  },
  args: {
    resize: "end-end",
    draggable: true,
    x: "",
    y: "",
    w: "",
    h: "",
    snap: false,
    modal: true,
    gestures: true,
  },
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
          data-resize={args.resize === "none" ? undefined : args.resize}
          data-draggable={args.draggable ? "" : undefined}
          style={channelStyle(args)}
        >
          {/* Auto-open + gestures on mount; the onConnect effectScope
              disposes the gestures on disconnect (story re-render). */}
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              if (args.gestures)
                createOverlayGestures(
                  el,
                  args.snap
                    ? { resize: detents([0.25, 0.6, 0.9]) }
                    : undefined,
                );
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

/** Centered window: move from the top strip, corner grip resize. */
export const Window: Story = {};

/** Bottom edge, full constraint width, height drag from the top handle
 * (snapped). */
export const BottomSheet: Story = {
  args: {
    resize: "block-start",
    draggable: false,
    y: "9999px",
    w: "var(--overlay-constraint-width)",
    h: "60svh",
    snap: true,
  },
};

export const TopSheet: Story = {
  args: {
    resize: "block-end",
    draggable: false,
    y: "-9999px",
    w: "var(--overlay-constraint-width)",
    h: "60svh",
    snap: true,
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
    snap: true,
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
    const overlay = signal<HTMLDialogElement | null>();
    const selected = signal(CENTER.label);
    const moveTo = (cell: Cell) => {
      selected(cell.label);
      applyCell(overlay(), cell);
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
          ref={overlay}
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
          data-resize={CENTER.resize}
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              if (args.gestures) createOverlayGestures(el);
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
    ) as Node;
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

type AnchoredArgs = Args & { area: (typeof AREAS)[number] };

/**
 * `data-anchor="element"` — the popover opens in the `--overlay-area`
 * region of whichever trigger invoked it. Where CSS anchor positioning
 * exists the invoker is the implicit anchor and everything (placement,
 * flip near the viewport edge, scroll tracking) is pure CSS; the click
 * handler also wires `anchorOverlay`, which pins an explicit
 * `anchor-name` pair there and is the Floating UI fallback everywhere
 * else (without it, browsers below the gate open centered).
 */
export const Anchored: StoryObj<AnchoredArgs> = {
  argTypes: {
    area: {
      control: "select",
      options: [...AREAS],
      description:
        "--overlay-area — the position-area region the popover occupies relative to its trigger",
    },
    resize: { control: false },
    draggable: { control: false },
    x: { control: false },
    y: { control: false },
    w: { control: false },
    h: { control: false },
    snap: { control: false },
    modal: { control: false },
    gestures: { control: false },
  },
  args: {
    area: "block-end",
    resize: "none",
    draggable: false,
    modal: false,
    gestures: false,
  },
  render: (args) => {
    const id = `overlay-story-${uid++}`;
    const overlay = signal<HTMLDialogElement | null>();
    let anchored: OverlayAnchor | null = null;
    const wire = (ev: Event) => {
      const el = overlay();
      if (!el) return;
      // Re-anchor to the clicked trigger — explicit anchor-name pair
      // under the native tier, Floating UI loop otherwise.
      anchored?.dispose();
      anchored = anchorOverlay(el, ev.currentTarget as Element);
    };
    const trigger = (inset: string, label: string) => (
      <button
        class:unset
        class:x-button
        data-variant="solid"
        data-size="2"
        popovertarget={id}
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
          ref={overlay}
          id={id}
          class:unset
          class:x-overlay
          popover="auto"
          data-anchor="element"
          style={`--overlay-area: ${args.area}; --overlay-w: 260px`}
        >
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Anchored</strong>
            <p>
              Opens in the <code>{args.area}</code> region of the clicked
              trigger; edge triggers flip instead of overflowing. Light
              dismiss, no gestures.
            </p>
          </div>
        </dialog>
      </>
    ) as Node;
  },
};

/**
 * `constrainOverlay(panel, container)` syncs the container's rect into the
 * `--overlay-constraint-*` variables: the location point clamps to the
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
    const overlay = signal<HTMLDialogElement | null>();
    const container = signal<HTMLElement | null>();
    const selected = signal(matchCell(args));
    const moveTo = (cell: Cell) => {
      selected(cell.label);
      applyCell(overlay(), cell);
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
          ref={overlay}
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
    ) as Node;
  },
};
