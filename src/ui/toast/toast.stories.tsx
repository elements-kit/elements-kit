import type { Meta, StoryObj } from "@storybook/html-vite";
import { computed, effect, signal } from "elements-kit/signals";
import { promise } from "@/utilities/promise.ts";
import { StoryIcon } from "../../../storybook/icon";
import { Align, place } from "../overlay/area.ts";
import { ElementBox, MarginBox, VIEWPORT_BOX } from "../overlay/box.ts";
import { Toaster, type Toast } from "./toast.ts";

import "../alert/alert.css";
import "../button/button.css";
import "../card/card.css";
import "../overlay/index.css";
import "../overlay/overlay.css";
import "../toolbar/toolbar.css";

const meta = { title: "UI/Toast" } satisfies Meta;
export default meta;

let n = 0;

/** Your element: an overlay frame (sized by `--overlay-w`) around a frosted
 * card (the surface: glass, ring, radius) holding an alert (the layout: icon,
 * text, close in its end slot). */
const Alert = (t: Toast, text: string | (() => string), accent = "blue") => (
  <div class:unset style="--overlay-w: min(356px, 100vw - 32px)">
    <div
      class:unset
      class:x-card
      data-variant="elevated"
      data-size="2"
      data-material-background="translucent"
      style="padding: 0"
    >
      <div class:unset class:x-alert data-size="2" data-accent={accent}>
        <StoryIcon name="info" class="x-alert-icon" size="16px" />
        <div>{text}</div>
        <div class="x-alert-trailing">
          <button
            class:unset
            class:x-button
            data-variant="borderless"
            data-size="1"
            data-icon
            aria-label="Close"
            on:click={() => t.dismiss()}
          >
            <StoryIcon name="close" size="16px" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

const POSITIONS = {
  "top-start": [Align.start, Align.start],
  "top-center": [Align.center, Align.start],
  "top-end": [Align.end, Align.start],
  "bottom-start": [Align.start, Align.end],
  "bottom-center": [Align.center, Align.end],
  "bottom-end": [Align.end, Align.end],
} as const;

interface Args {
  position: keyof typeof POSITIONS;
  margin: number;
  gap: number;
  max: number;
  expand: boolean;
  duration: number;
}

/** One Toaster for the story, rebuilt when an arg that shapes it changes. */
let current: { toaster: Toaster; key: string } | undefined;
const toasterFor = (args: Args) => {
  const key = `${args.position}|${args.margin}|${args.gap}|${args.max}`;
  if (current?.key !== key) {
    current?.toaster[Symbol.dispose]();
    const [x, y] = POSITIONS[args.position];
    const area = new MarginBox(VIEWPORT_BOX, -args.margin).toArea(x, y);
    current = { toaster: new Toaster({ area, gap: args.gap, max: args.max }), key };
  }
  current.toaster.expanded(args.expand);
  return current.toaster;
};

// A Toaster from the args (the page's own `toast()` is top-end, 16px in).
// Hover the stack to spread it; swipe one away.
export const Default: StoryObj<Args> = {
  argTypes: {
    position: { control: "select", options: Object.keys(POSITIONS) },
    margin: { control: { type: "range", min: 0, max: 48, step: 4 } },
    gap: { control: { type: "range", min: 0, max: 24, step: 2 } },
    max: { control: { type: "range", min: 1, max: 6, step: 1 } },
    expand: { control: "boolean" },
    duration: { control: { type: "range", min: 1000, max: 10000, step: 500 } },
  },
  args: { position: "top-end", margin: 16, gap: 8, max: 3, expand: false, duration: 4000 },
  render: (args) => {
    const show = (text: string, accent?: string) =>
      toasterFor(args).show((t) => {
        t.duration(args.duration);
        return Alert(t, text, accent);
      });
    const upload = () => {
      const file = promise(new Promise<string>((r) => setTimeout(() => r("report.pdf"), 1500)));
      toasterFor(args).show((t) => {
        // Stays while uploading, then the full duration from when it's done.
        effect(() => t.duration(file.state === "pending" ? Infinity : args.duration));
        return Alert(t, () => (file.state === "pending" ? "Uploading…" : `Uploaded ${file.value}`), "mint");
      });
    };
    toasterFor(args);
    return (
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <button class:unset class:x-button data-variant="soft" on:click={() => show(`Saved #${++n}`)}>
          Show
        </button>
        <button
          class:unset
          class:x-button
          data-variant="soft"
          on:click={() => show(`A longer message #${++n} that wraps onto a second line to show uneven heights.`, "amber")}
        >
          Show long
        </button>
        <button class:unset class:x-button data-variant="soft" on:click={upload}>
          Upload
        </button>
        <button class:unset class:x-button data-variant="soft" on:click={() => toasterFor(args).dismiss()}>
          Dismiss all
        </button>
      </div>
    );
  },
};

// The overlay outlives the toast: `release()` takes it out of the stack, and
// the same element and box become a centered panel — it glides and grows there.
export const Expand: StoryObj = {
  render: () => {
    let toaster: Toaster | undefined;
    const show = () => {
      toaster ??= new Toaster();
      toaster.show((t) => {
        t.duration(10000);
        const open = signal(false);
        const expand = () => {
          const box = t.release();
          open(true);
          box.w = Math.min(480, VIEWPORT_BOX.w - 32);
          place(box, VIEWPORT_BOX.toArea(Align.center, Align.center));
        };
        const close = () => {
          const el = t.box.element;
          el.hidePopover();
          Promise.allSettled(el.getAnimations().map((a) => a.finished)).then(() => t[Symbol.dispose]());
        };
        return (
          <div class:unset style="--overlay-w: min(356px, 100vw - 32px)">
            <div
              class:unset
              class:x-card
              data-variant="elevated"
              data-size="2"
              data-material-background="translucent"
              style="display: grid; gap: 8px"
            >
              <strong>New message</strong>
              <p style="margin: 0">Maya: are we still on for 3pm?</p>
              <p prop:hidden={computed(() => !open())} style="margin: 0; color: var(--neutral-11)">
                I booked the small room. Bring the slides if you have them — we can go
                through the numbers before the call.
              </p>
              <div style="display: flex; gap: 8px; justify-content: end">
                <button
                  class:unset
                  class:x-button
                  data-variant="soft"
                  data-size="1"
                  on:click={() => (open() ? close() : expand())}
                >
                  {() => (open() ? "Close" : "Open")}
                </button>
              </div>
            </div>
          </div>
        ) as HTMLElement;
      });
    };
    return (
      <button class:unset class:x-button data-variant="soft" on:click={show}>
        Get a message
      </button>
    );
  },
};

// A toaster of your own: top-center of a panel.
export const InPanel: StoryObj = {
  render: () => {
    const panel = (
      <div class:unset class:x-card style="height: 320px; max-width: 480px; display: grid; place-items: center">
        Toasts stack in this panel
      </div>
    ) as HTMLElement;
    let toaster: Toaster | undefined;
    const show = () => {
      toaster ??= new Toaster({
        area: new MarginBox(new ElementBox(panel), -12).toArea(Align.center, Align.start),
      });
      toaster.show((t) => Alert(t, `In the panel #${++n}`));
    };
    return (
      <div style="display: grid; gap: 12px">
        <button class:unset class:x-button data-variant="soft" style="justify-self: start" on:click={show}>
          Show in panel
        </button>
        {panel}
      </div>
    );
  },
};

const ACCENTS = ["blue", "mint", "amber", "crimson", "iris"];

// The stack is a signal you can write: shuffle or reverse it, and every toast
// glides to its new place. Kept spread (`expand`) so you see them move.
export const Reorder: StoryObj = {
  render: () => {
    let toaster: Toaster | undefined;
    const get = () => (toaster ??= new Toaster({ max: 5, expand: true }));
    const show = () => {
      const k = ++n;
      get().show((t) => {
        t.duration(Infinity);
        return Alert(t, `Toast #${k}`, ACCENTS[k % ACCENTS.length]);
      });
    };
    const shuffle = () => {
      const list = [...get().toasts()];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j]!, list[i]!];
      }
      get().toasts(list);
    };
    return (
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <button class:unset class:x-button data-variant="soft" on:click={show}>
          Show
        </button>
        <button class:unset class:x-button data-variant="soft" on:click={shuffle}>
          Shuffle
        </button>
        <button class:unset class:x-button data-variant="soft" on:click={() => get().toasts([...get().toasts()].reverse())}>
          Reverse
        </button>
        <button class:unset class:x-button data-variant="soft" on:click={() => get().dismiss()}>
          Dismiss all
        </button>
      </div>
    );
  },
};

// Under a toolbar: the area is the viewport cut at the bar's bottom edge. It's
// live, so the stack follows the bar.
export const WithToolbar: StoryObj = {
  parameters: { layout: "fullscreen" },
  render: () => {
    let toaster: Toaster | undefined;
    const header = (
      <header class:unset class:x-toolbar data-variant="surface" data-reveal="always" style="position: sticky; top: 0">
        <div />
        <span data-title="">Inbox</span>
        <div>
          <button
            class:unset
            class:x-button
            data-variant="borderless"
            on:click={() => {
              toaster ??= new Toaster({
                area: new MarginBox(VIEWPORT_BOX, -12)
                  .toArea(Align.end, Align.start)
                  .intersect({ get ymin() { return bar.ymax + 8; } }),
              });
              toaster.show((t) => Alert(t, `Archived #${++n}`));
            }}
          >
            Archive
          </button>
        </div>
      </header>
    ) as HTMLElement;
    const bar = new ElementBox(header);
    return (
      <div style="min-height: 200dvh">
        {header}
        <p style="padding: 16px">Archive a few: they stack under the bar, not over it.</p>
      </div>
    );
  },
};
