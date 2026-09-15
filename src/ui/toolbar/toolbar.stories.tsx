import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Children } from "elements-kit/jsx-runtime";
import { effect, effectScope } from "elements-kit/signals";

import { createElementScroll } from "../../utilities/element-scroll";
import { fromEvent, sync } from "../../utilities/event-driven";
import "../../utilities/dom-lifecycle";
import "../avatar/avatar.css";
import "../button/button.css";
import "../segmented-control/segmented-control.css";
import "../text-input/text-input.css";
import "./toolbar.css";
import { onCleanup } from "@/signals";

interface Args {
  /** data-variant of the screen's bars */
  variant: "surface" | "soft" | "clean";
}

/** Writes raw scroll (px) on `host`; toolbar.css turns it into progress. */
function driveScroll(host: HTMLElement, y: () => number) {
  const barTitle = host.querySelector<HTMLElement>(
    '.x-toolbar:not([data-position="bottom"]) [data-title]',
  );
  const hasLargeTitle = host.querySelector(".x-large-title") !== null;

  effect(() => {
    host.style.setProperty("--scroll-y", `${y()}px`);
    // expanded: large title is the heading, bar title stays silent
    barTitle?.toggleAttribute("aria-hidden", hasLargeTitle && y() <= 0);
  });
  onCleanup(() => host.style.removeProperty("--scroll-y"));
}

// ── Building blocks ──────────────────────────────────────────────────────────

// 24px grid (Lucide shapes)
const ICONS = {
  back: "M15 18l-6-6 6-6",
  search: "M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM21 21l-4.3-4.3",
  more: "M6 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM20 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
  compose:
    "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.4 2.6a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z",
  filter: "M3 6h18M7 12h10M10 18h4",
  video:
    "M16 13l5.2 3.1a.5.5 0 0 0 .8-.4V8.3a.5.5 0 0 0-.8-.4L16 11M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
  pen: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
  text: "M4 7V4h16v3M9 20h6M12 4v16",
  shapes:
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
};

/** Sized by the surrounding font-size. */
const Icon = (props: { d: string }) => (
  <svg
    width="1.25em"
    height="1.25em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d={props.d} />
  </svg>
);

// text buttons: in clean/soft bars the capsule is their background
const IconButton = (props: { label: string; d: string }) => (
  <button
    class:unset
    class:x-button
    data-variant="text"
    data-size="2"
    data-icon=""
    aria-label={props.label}
  >
    <Icon d={props.d} />
  </button>
);

const TextButton = (props: { label: string; d?: string }) => (
  <button class:unset class:x-button data-variant="text" data-size="2">
    {props.d ? <Icon d={props.d} /> : null}
    {props.label}
  </button>
);

const Title = (props: { text: string }) => (
  <span data-title="">{props.text}</span>
);

const Search = (props: { placeholder: string }) => (
  <div class:x-text-input data-variant="surface" data-size="3">
    {/* affix: text-input pads non-input children, so the icon needs its own wrapper */}
    <span>
      <Icon d={ICONS.search} />
    </span>
    <input
      class:unset
      type="search"
      placeholder={props.placeholder}
      aria-label={props.placeholder}
    />
  </div>
);

let segmentedId = 0;

const Segmented = (props: { label: string; options: string[] }) => {
  const name = `toolbar-seg-${segmentedId++}`;
  return (
    <div
      class:unset
      class:x-segmented-control
      data-size="2"
      role="radiogroup"
      aria-label={props.label}
    >
      {props.options.map((option, i) => (
        <label>
          <input
            type="radio"
            name={name}
            value={option}
            checked={i === 0 || undefined}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
};

/** Regular content under the large title (search, filter); scrolls with the list. */
const Controls = (props: { children?: Children }) => (
  <div style="display:grid;padding:var(--space-2) var(--space-4)">
    {props.children}
  </div>
);

/** List rows; colored swatches show what translucent bars let through. */
const Rows = (props: { items: string[] }) => (
  <>
    {props.items.map((item, i) => (
      <p style="display:flex;align-items:center;gap:var(--space-3);margin:0;padding:var(--space-3) var(--space-4);box-shadow:inset 0 -1px var(--neutral-a3)">
        <span
          style={`width:var(--space-7);height:var(--space-7);border-radius:var(--radius-3);flex:none;background:oklch(0.72 0.14 ${(i * 37) % 360})`}
        />
        {item}
      </p>
    ))}
  </>
);

/** An element scrolls: --scroll-y lives on it. */
function Screen(props: { width?: number; children?: Children }) {
  let stop: (() => void) | undefined;
  onCleanup(() => stop?.());
  return (
    <div
      ref={(el) => {
        stop = effectScope(() => driveScroll(el, createElementScroll(el).y));
      }}
      style={`height:560px;max-width:${props.width ?? 390}px;overflow:auto;border-radius:var(--radius-5);box-shadow:0 0 0 1px var(--neutral-a5)`}
    >
      {props.children}
    </div>
  );
}

const repeat = (items: string[], n: number) =>
  Array.from({ length: n }, (_, i) => items[i % items.length]);

const SETTINGS = [
  "Wi-Fi",
  "Bluetooth",
  "Cellular",
  "Personal Hotspot",
  "Notifications",
  "Sounds & Haptics",
  "Focus",
  "Screen Time",
  "General",
  "Control Center",
  "Display & Brightness",
  "Home Screen",
  "Accessibility",
  "Wallpaper",
  "Siri & Search",
  "Face ID & Passcode",
  "Emergency SOS",
  "Battery",
  "Privacy & Security",
  "App Store",
  "Wallet",
  "Passwords",
  "Mail",
  "Contacts",
  "Calendar",
  "Notes",
  "Reminders",
  "Messages",
  "Phone",
  "Safari",
];

const MAIL = repeat(
  ["Apple", "Figma", "GitHub", "Linear", "Mom", "Stripe", "Vercel", "Notion"],
  30,
);

const NOTES = repeat(
  [
    "Groceries",
    "Trip to Lisbon",
    "Book list",
    "Standup notes",
    "Gift ideas",
    "Recipes",
  ],
  30,
);

const MESSAGES = repeat(
  [
    "Morning!",
    "Shipped the fix",
    "Review when you can",
    "Lunch?",
    "On my way",
    "👍",
  ],
  30,
);

const DAYS = repeat(
  ["Today", "Yesterday", "Saturday", "Friday", "Last week"],
  30,
);

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: "UI/Toolbar",
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["surface", "soft", "clean"],
      description:
        "surface: material bar + hairline · clean: no bar, capsules · soft: clean + gradient blur edge",
    },
  },
  args: { variant: "surface" },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

// ── Examples ─────────────────────────────────────────────────────────────────

/** Large title first, then the search bar: the title scrolls away, the search pins at the top. */
export const Settings: Story = {
  render: (args) => (
    <Screen>
      <h1 class:x-large-title>Settings</h1>
      <header class:x-toolbar data-variant={args.variant}>
        <Search placeholder="Search" />
      </header>
      <div>
        <Rows items={SETTINGS} />
      </div>
    </Screen>
  ),
};

/** Back + title + action, a segmented filter under the large title, a status bottom bar. */
export const Inbox: Story =
  {
    render: (args) => (
      <Screen>
        <header class:x-toolbar data-variant={args.variant}>
          <div>
            <TextButton label="Mailboxes" d={ICONS.back} />
          </div>
          <Title text="Inbox" />
          <div>
            <TextButton label="Edit" />
          </div>
        </header>
        <h1 class:x-large-title>Inbox</h1>
        <div>
          <Controls>
            <Segmented label="Filter" options={["All", "Unread", "Flagged"]} />
          </Controls>
          <Rows items={MAIL} />
        </div>
        <footer
          class:x-toolbar
          data-position="bottom"
          data-variant={args.variant}
        >
          <div>
            <IconButton label="Filter" d={ICONS.filter} />
          </div>
          <Title text="Updated just now" />
          <div>
            <IconButton label="Compose" d={ICONS.compose} />
          </div>
        </footer>
      </Screen>
    ),
  };

/** iOS 26 list: floating capsules, search and compose at the bottom. */
export const Notes: Story = {
  args: { variant: "soft" },
  render: (args) => (
    <Screen>
      <header class:x-toolbar data-variant={args.variant}>
        <div>
          <IconButton label="Folders" d={ICONS.back} />
        </div>
        <div>
          <IconButton label="Share" d={ICONS.share} />
          <IconButton label="More" d={ICONS.more} />
        </div>
      </header>
      <h1 class:x-large-title>Notes</h1>
      <div>
        <Rows items={NOTES} />
      </div>
      <footer
        class:x-toolbar
        data-position="bottom"
        data-variant={args.variant}
      >
        <div>
          <Search placeholder="Search notes" />
        </div>
        <div>
          <IconButton label="New note" d={ICONS.compose} />
        </div>
      </footer>
    </Screen>
  ),
};

/** Bar only; a segmented control is the whole bottom bar. */
export const Photos: Story = {
  args: { variant: "soft" },
  render: (args) => (
    <Screen>
      <header class:x-toolbar data-variant={args.variant}>
        <Title text="Library" />
        <div>
          <TextButton label="Select" />
        </div>
      </header>
      <div>
        <Rows items={DAYS} />
      </div>
      <footer
        class:x-toolbar
        data-position="bottom"
        data-variant={args.variant}
      >
        <Segmented label="Group by" options={["Years", "Months", "All"]} />
      </footer>
    </Screen>
  ),
};

/** No bar: a large title with an avatar that scrolls away. */
export const Today: Story = {
  parameters: { controls: { exclude: ["variant"] } },
  render: () => (
    <Screen>
      <div class:x-large-title>
        <h1 data-title="">Today</h1>
        {/* display:flex drops the inline line box, so the row stays one title line tall */}
        <button class:unset aria-label="Profile" style="display:flex">
          <span class:x-avatar data-size="3" data-variant="soft">
            <span class:x-avatar-fallback>AK</span>
          </span>
        </button>
      </div>
      <div>
        <Rows items={NOTES} />
      </div>
    </Screen>
  ),
};

/** Material-like: title next to back, icon actions, no large title. */
export const Chat: Story = {
  render: (args) => (
    <Screen>
      <header class:x-toolbar data-variant={args.variant}>
        <div>
          {/* own wrapper: a capsule in clean/soft bars */}
          <div>
            <IconButton label="Back" d={ICONS.back} />
          </div>
          <Title text="Design Team" />
        </div>
        <div>
          <IconButton label="Video call" d={ICONS.video} />
          <IconButton label="More" d={ICONS.more} />
        </div>
      </header>
      <div>
        <Rows items={MESSAGES} />
      </div>
    </Screen>
  ),
};

/** iPad item groupings (HIG): [back title] … [tools] … [share more]. */
export const Editor: Story = {
  args: { variant: "soft" },
  render: (args) => (
    <Screen width={1024}>
      <header class:x-toolbar data-variant={args.variant}>
        <div>
          <div>
            <IconButton label="Back" d={ICONS.back} />
          </div>
          <Title text="Q3 Report" />
        </div>
        <div role="group" aria-label="Tools">
          <IconButton label="Pen" d={ICONS.pen} />
          <IconButton label="Text" d={ICONS.text} />
          <IconButton label="Shapes" d={ICONS.shapes} />
        </div>
        <div>
          <IconButton label="Share" d={ICONS.share} />
          <IconButton label="More" d={ICONS.more} />
        </div>
      </header>
      <div>
        <Rows items={NOTES} />
      </div>
    </Screen>
  ),
};

/** The page scrolls: bar nested in the app (main > section), --scroll-y lives on <html>. */
export const PageScroll: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => {
    let stop: (() => void) | undefined;
    return (
      <main>
        <section>
          <h1 class:x-large-title>Settings</h1>
          <header class:x-toolbar data-variant={args.variant}>
            <Search placeholder="Search" />
          </header>
          <div>
            <Rows items={repeat(SETTINGS, 60)} />
          </div>
        </section>
        <dom-lifecycle
          onConnect={() => {
            stop = effectScope(() => {
              const [y] = sync(
                fromEvent(window, "scroll"),
                () => window.scrollY,
              );
              driveScroll(document.documentElement, y);
            });
          }}
          onDisconnect={() => stop?.()}
        />
      </main>
    );
  },
};
