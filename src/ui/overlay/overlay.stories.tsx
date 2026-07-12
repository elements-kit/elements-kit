import type { Meta, StoryObj } from "@storybook/html-vite";
import { computed, effectScope, signal } from "elements-kit/signals";
import "@/utilities/dom-lifecycle.ts";
import "../card/card.css";
import "../button/button.css";
import "../toggle/toggle.css";
import "./index.css";
import "./overlay.css";
import { AUTO, Anchor, Overlay } from "./index.ts";

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

/** The gesture affordances as authored `.x-handle` children (siblings of
 * the card): a resize grip for `resize`, a move grab pill when `move`. */
function Handles(resize: string, move: boolean) {
  return (
    <>
      {resize && resize !== "none" && (
        <div class:x-handle data-placement={resize} />
      )}
      {move && <div class:x-handle data-placement="move" />}
    </>
  );
}

function makeHandle(placement: string): HTMLDivElement {
  const h = document.createElement("div");
  h.className = "x-handle";
  h.dataset.placement = placement;
  return h;
}

/** Swap the RESIZE handle (leaves any move handle intact) — the imperative
 * counterpart of {@link Handles} for the morph stories. */
function setResizeHandle(el: Element, placement: string): void {
  el
    .querySelectorAll(':scope > .x-handle:not([data-placement="move"])')
    .forEach((h) => h.remove());
  if (placement && placement !== "none") el.appendChild(makeHandle(placement));
}

/** Add or remove the move grab handle. */
function setMoveHandle(el: Element, on: boolean): void {
  el.querySelector(':scope > .x-handle[data-placement="move"]')?.remove();
  if (on) el.appendChild(makeHandle("move"));
}

/** Dock/size an overlay to its edge NOW (before it's shown), so the CSS enter
 * animation slides in from the settled docked position rather than racing a
 * toggle-time JS write (which starts the slide from the origin). `box:{x:0}`
 * suppresses the auto-center; the sheet/drawer sizes are explicit, so no
 * measurement (which would need the box visible) is required. */
function dockOnOpen(
  el: HTMLDialogElement,
  geo: (o: Overlay, vw: number, vh: number) => void,
): Overlay {
  const o = new Overlay(el, { box: { x: 0, y: 0 } });
  geo(o, globalThis.innerWidth, globalThis.innerHeight);
  return o;
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
        "the resize .x-handle's data-placement — the side the grip sits on; a start/end pair (block first) for a corner grip",
    },
    draggable: {
      control: "boolean",
      description: "adds a move .x-handle — x/y window move from a grab pill",
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
          {Handles(args.resize, args.draggable)}
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
 * `block-start` `.x-handle` is both the pill affordance and its
 * hit-target), and a one-line `Overlay` subclass swaps the gesture
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
        <dialog id={id} class:unset class:x-overlay popover="auto">
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              dockOnOpen(el, (o, vw, vh) => {
                o.set({ x: 0, w: vw, h: Math.round(vh * 0.6) });
                o.dock("bottom");
              });
            }}
          />
          <div class:unset class:x-card data-variant="elevated" data-size="3">
            <strong>Bottom sheet</strong>
            <p>
              Drag the top pill — the height snaps to 25 / 60 / 90% of the
              viewport. Flick down past the smallest stop to dismiss.
            </p>
          </div>
          <div class:x-handle data-placement="block-start" data-detents="0.25 0.6 0.9" />
        </dialog>
      </>
    );
  },
};

const OFF_CONTROLS = {
  resize: { control: false },
  draggable: { control: false },
  x: { control: false },
  y: { control: false },
  w: { control: false },
  h: { control: false },
  modal: { control: false },
  gestures: { control: false },
} as const;

/** A docked/sized overlay with a single resize handle — JS geometry via
 * `dockOnOpen` (o.set + o.dock), the new replacement for channel authoring. */
function sheetStory(
  title: string,
  body: string,
  placement: string,
  popover: "auto" | "manual",
  geo: (o: Overlay, vw: number, vh: number) => void,
  min?: number,
): Story {
  return {
    argTypes: OFF_CONTROLS,
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
          >
            Open
          </button>
          <dialog id={id} class:unset class:x-overlay popover={popover}>
            <dom-lifecycle
              onConnect={(self) => {
                const el = self.parentElement as HTMLDialogElement;
                dockOnOpen(el, geo);
              }}
            />
            <div class:unset class:x-card data-variant="elevated" data-size="3">
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
            <div
              class:x-handle
              data-placement={placement}
              data-min={min ? String(min) : undefined}
            />
          </dialog>
        </>
      );
    },
  };
}

export const TopSheet = sheetStory(
  "Top sheet",
  "Drag the bottom pill — grows from the top (min height 200).",
  "block-end",
  "auto",
  (o, vw, vh) => {
    o.set({ x: 0, w: vw, h: Math.round(vh * 0.6) });
    o.dock("top");
  },
  200,
);

export const Drawer = sheetStory(
  "Drawer",
  "Drag the inner pill — resizes the width (min width 280).",
  "inline-start",
  "auto",
  (o, _vw, vh) => {
    o.set({ w: 420, h: vh, y: 0 });
    o.dock("right");
  },
  280,
);

export const CornerPanel = sheetStory(
  "Corner panel",
  "Grip faces inward — the docked corner stays put.",
  "start-start",
  "manual",
  (o, _vw, vh) => {
    o.set({ w: 300, h: Math.round(vh * 0.6) });
    o.dock("bottom", "right");
  },
);

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
 * Applies a grid cell's full recipe to the live overlay via the new box API:
 * size to full (capped by the constraint) or content-auto, then center and
 * dock the saturated axes. Replaces the old `--overlay-*` channel writes.
 */
function applyCell(o: Overlay | null | undefined, cell: Cell) {
  if (!o) return;
  setResizeHandle(o.element, cell.resize);
  // Full extent (Infinity → capped to the constraint by `set`) or content-auto.
  o.set({ w: cell.w ? Infinity : AUTO, h: cell.h ? Infinity : AUTO });
  // Reactive center + dock — stays flush as the size morphs (a one-shot
  // measurement lands mid-transition, missing the edge).
  const sides: ("top" | "bottom" | "left" | "right")[] = [];
  if (cell.x === "9999px") sides.push("right");
  else if (cell.x === "-9999px") sides.push("left");
  if (cell.y === "9999px") sides.push("bottom");
  else if (cell.y === "-9999px") sides.push("top");
  o.place(...sides);
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
  render: () => {
    const id = `overlay-story-${uid++}`;
    const panel = signal<HTMLDialogElement | null>();
    const overlay = signal<Overlay | null>(null);
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
          ref={panel}
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              setResizeHandle(el, CENTER.resize);
              const o = new Overlay(el);
              overlay(o);
              el.showPopover();
              applyCell(o, CENTER);
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
                anchor: new Anchor(() => target() ?? undefined),
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
 * Tear-off: `new Overlay(el, { anchor })` + a move `.x-handle` — the panel follows its
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
              Anchored to its trigger — drag the grab pill anywhere (the drag
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
          <div class:x-handle data-placement="move" />
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
          style="position: fixed; top: 132px; left: 96px"
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
              new Overlay(el, { anchor: new Anchor(() => target() ?? undefined) });
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
    const overlay = signal<Overlay | null>(null);
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
          ref={panel}
          id={id}
          class:unset
          class:x-overlay
          popover="manual"
        >
          <dom-lifecycle
            onConnect={(self) => {
              const el = self.parentElement as HTMLDialogElement;
              setResizeHandle(el, args.resize);
              setMoveHandle(el, args.draggable);
              const o = new Overlay(el, { within: container()! });
              overlay(o);
              el.showPopover();
              applyCell(o, matchCell(args) ? GRID.find((c) => c.label === matchCell(args))! : CENTER);
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

    // Clear the ElementBox geometry channels too, so the next recipe starts
    // from a clean slate instead of inheriting the previous shape.
    const CHANNELS = ["--overlay-area", "--x", "--y", "--w", "--h", "--dx", "--dy"];
    const reset = (el: HTMLDialogElement) => {
      stop?.();
      stop = null;
      for (const name of CHANNELS) el.style.removeProperty(name);
      el.querySelectorAll(":scope > .x-handle").forEach((h) => h.remove());
    };
    const setChannels = (el: HTMLDialogElement, channels: Record<string, string>) => {
      for (const [name, value] of Object.entries(channels))
        el.style.setProperty(name, value);
    };

    const vw = () => globalThis.innerWidth;
    const vh = () => globalThis.innerHeight;
    const recipes: Record<string, (el: HTMLDialogElement, trigger: Element) => void> = {
      Menu: (el, trigger) => {
        setChannels(el, { "--overlay-area": "block-end span-inline-end", "--overlay-w": "220px" });
        stop = effectScope(() => void new Overlay(el, { anchor: new Anchor(trigger) }));
      },
      Popover: (el, trigger) => {
        setChannels(el, { "--overlay-area": "block-end", "--overlay-w": "300px" });
        stop = effectScope(() => void new Overlay(el, { anchor: new Anchor(trigger) }));
      },
      Sheet: (el) => {
        setResizeHandle(el, "block-start");
        el.querySelector('.x-handle[data-placement="block-start"]')
          ?.setAttribute("data-detents", "0.25 0.45 0.9");
        stop = effectScope(() => {
          const o = new Overlay(el, { box: { x: 0, y: 0 } });
          o.set({ w: vw(), h: Math.round(vh() * 0.45) });
          o.place("bottom");
        });
      },
      Drawer: (el) => {
        setResizeHandle(el, "inline-start");
        stop = effectScope(() => {
          const o = new Overlay(el, { box: { x: 0, y: 0 } });
          o.set({ w: 320, h: vh() });
          o.place("right");
        });
      },
      Window: (el) => {
        setResizeHandle(el, "end-end");
        setMoveHandle(el, true);
        stop = effectScope(() => {
          const o = new Overlay(el, { box: { x: 0, y: 0 } });
          o.set({ w: 480, h: 360 });
          o.center(); // one-shot — centered at open, then draggable
        });
      },
      Corner: (el) => {
        setResizeHandle(el, "start-start");
        stop = effectScope(() => {
          const o = new Overlay(el, { box: { x: 0, y: 0 } });
          o.set({ w: 300, h: Math.round(vh() * 0.4) });
          o.place("bottom", "right");
        });
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
        // Re-enter the top layer as a modal, centered.
        el.hidePopover();
        el.showModal();
        stop = effectScope(() => {
          const o = new Overlay(el);
          o.center();
        });
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
