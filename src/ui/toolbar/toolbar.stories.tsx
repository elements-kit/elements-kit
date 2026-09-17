import { StoryIcon, type IconName } from "../../../storybook/icon";
import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Children } from "elements-kit/jsx-runtime";
import { effect, effectScope } from "elements-kit/signals";

import { fromEvent, sync } from "../../utilities/event-driven";
import "../../utilities/dom-lifecycle";
import "../avatar/avatar.css";
import "../button/button.css";
import "../group/group.css";
import "../segmented-control/segmented-control.css";
import "../text-input/text-input.css";
import "./toolbar.css";
import { onCleanup } from "@/signals";

type Variant = "surface" | "soft" | "clean";

interface Args {
  /** data-variant of the screen's bars */
  variant: Variant;
  /** theme radius (Theme controls): pill by default, like iOS */
  radius?: "none" | "small" | "medium" | "large" | "pill";
}

/**
 * Writes raw scroll (px) as --scroll-y on the bars and the large title under `host`; toolbar.css turns it
 * into progress. Only they read it: set on `host` (e.g. <html>) it would restyle the whole page every frame.
 */
function driveScroll(host: HTMLElement, y: () => number) {
  const targets = [
    ...host.querySelectorAll<HTMLElement>(
      ".x-toolbar:not(.x-toolbar .x-toolbar), .x-large-title",
    ),
  ];
  const barTitle = host.querySelector<HTMLElement>(
    '.x-toolbar:not([data-position="bottom"]) [data-title]',
  );
  const hasLargeTitle = host.querySelector(".x-large-title") !== null;

  effect(() => {
    const value = `${y()}px`;
    for (const target of targets) target.style.setProperty("--scroll-y", value);
    // expanded: large title is the heading, bar title stays silent
    barTitle?.toggleAttribute("aria-hidden", hasLargeTitle && y() <= 0);
  });
  onCleanup(() => {
    for (const target of targets) target.style.removeProperty("--scroll-y");
  });
}

// ── Building blocks ──────────────────────────────────────────────────────────

const ICONS = {
  search: "search",
  more: "more_horiz",
  share: "share",
  compose: "edit_square",
  filter: "filter_list",
  home: "home",
  library: "local_library",
  profile: "person",
  video: "videocam",
  pen: "edit",
  text: "title",
  shapes: "shapes",
} as const;

/** clean/soft bars float their controls */
const floats = (variant: Variant) => variant !== "surface";

/** Material Symbols use a 24px box for toolbar controls. */
const Icon = (props: { name: IconName }) => (
  <StoryIcon name={props.name} size="24px" />
);

/** clean/soft: borderless, the capsule is its box · surface: text, bleeds to the bar's padding */
/** clean/soft capsules hold size-3 controls (40px buttons, 48px capsules); surface bars size 2 */
const controlSize = (variant: Variant) => "3";

const buttonVariant = (variant: Variant) =>
  floats(variant) ? "borderless" : "text";

const IconButton = (props: {
  label: string;
  name: IconName;
  variant: Variant;
}) => (
  <button
    class:unset
    class:x-button
    data-variant={buttonVariant(props.variant)}
    data-size={controlSize(props.variant)}
    data-icon=""
    aria-label={props.label}
  >
    <Icon name={props.name} />
  </button>
);

const TextButton = (props: {
  label: string;
  name?: IconName;
  variant: Variant;
}) => (
  <button
    class:unset
    class:x-button
    data-variant={buttonVariant(props.variant)}
    data-size={controlSize(props.variant)}
  >
    {props.name ? <Icon name={props.name} /> : null}
    {props.label}
  </button>
);

/** data-back: a text-height chevron. With a label its glyph is flush (lines up with the title); alone, centered. */
const BackButton = (props: {
  label: string;
  variant: Variant;
  showLabel?: boolean;
}) =>
  props.showLabel ? (
    <button
      class:unset
      class:x-button
      data-variant={buttonVariant(props.variant)}
      data-size={controlSize(props.variant)}
      data-back=""
    >
      <StoryIcon name="arrow_back_ios" />
      {props.label}
    </button>
  ) : (
    <button
      class:unset
      class:x-button
      data-variant={buttonVariant(props.variant)}
      data-size={controlSize(props.variant)}
      data-back=""
      data-icon=""
      aria-label={props.label}
    >
      <StoryIcon name="arrow_back_ios_new" />
    </button>
  );

/** Buttons that belong together: a material capsule in clean/soft bars, a plain wrapper in surface. */
const Group = (props: {
  variant: Variant;
  label?: string;
  children?: Children;
}) =>
  floats(props.variant) ? (
    <div
      class:x-group
      data-variant="material"
      role={props.label ? "group" : undefined}
      aria-label={props.label}
    >
      {props.children}
    </div>
  ) : (
    <div role={props.label ? "group" : undefined} aria-label={props.label}>
      {props.children}
    </div>
  );

const Title = (props: { text: string }) => (
  <span data-title="">{props.text}</span>
);

/** The search field is size 3 in every bar; the bar holding it takes the same data-size. */
const SEARCH_SIZE = "3";

/** Floating: a soft field inside a material group, which is its background. */
const Search = (props: { placeholder: string; variant: Variant }) => {
  const floating = floats(props.variant);
  const field = (
    <div
      class:x-text-input
      data-variant={floating ? "soft" : "surface"}
      data-size={SEARCH_SIZE}
    >
      {/* affix: text-input pads non-input children, so the icon needs its own wrapper */}
      <span>
        <Icon name={ICONS.search} />
      </span>
      <input
        class:unset
        type="search"
        placeholder={props.placeholder}
        aria-label={props.placeholder}
      />
    </div>
  );
  return floating ? <Group variant={props.variant}>{field}</Group> : field;
};

let segmentedId = 0;

const Segmented = (props: {
  label: string;
  options: string[];
  variant: Variant;
  size?: "1" | "2" | "3";
  separators?: "none";
}) => {
  const name = `toolbar-seg-${segmentedId++}`;
  const floating = floats(props.variant);
  const control = (
    <div
      class:unset
      class:x-segmented-control
      data-variant={floating ? "soft" : "surface"}
      data-size={props.size ?? "3"}
      data-separators={props.separators}
      data-accent="neutral"
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
  // floating: a soft control inside a material group, which is its track
  return floating ? <Group variant={props.variant}>{control}</Group> : control;
};

const TABS = [
  ["Home", ICONS.home],
  ["Search", ICONS.search],
  ["Library", ICONS.library],
  ["Profile", ICONS.profile],
] as const;

/** Tab bar: a stacked segmented control. */
const Tabs = (props: { variant: Variant }) => {
  const name = `toolbar-tabs-${segmentedId++}`;
  const floating = floats(props.variant);
  const control = (
    <div
      class:unset
      class:x-segmented-control
      data-variant={floating ? "soft" : "surface"}
      data-size="2"
      data-layout="stacked"
      data-separators="none"
      data-accent="neutral"
      role="radiogroup"
      aria-label="Sections"
    >
      {TABS.map(([label, d], i) => (
        <label>
          <input
            type="radio"
            name={name}
            value={label.toLowerCase()}
            checked={i === 0 || undefined}
          />
          <Icon name={d} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
  return floating ? <Group variant={props.variant}>{control}</Group> : control;
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

/**
 * The page scrolls, as in an app on a phone: the list runs under the browser's bars and the safe areas,
 * and --scroll-y lives on <html>. The screen is at least the viewport tall, so a bottom bar sits at the bottom.
 */
function Screen(props: { variant?: Variant; children?: Children }) {
  let stop: (() => void) | undefined;
  return (
    <div style="min-height:100dvh">
      {/* first, so it isn't a sibling after the large title or after a bottom bar */}
      <dom-lifecycle
        onConnect={() => {
          // view timelines drive the collapse in CSS; --scroll-y is the fallback
          if (CSS.supports("animation-timeline: view()")) return;
          stop = effectScope(() => {
            const [y] = sync(fromEvent(window, "scroll"), () => window.scrollY);
            driveScroll(document.documentElement, y);
          });
        }}
        onDisconnect={() => stop?.()}
      />
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
        "surface: material bar + hairline · clean: no bar, material controls · soft: clean + gradient blur edge",
    },
  },
  args: { variant: "surface", radius: "pill" },
  // edge to edge, so a story opened on a phone is the screen
  parameters: { layout: "fullscreen" },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

// ── Examples ─────────────────────────────────────────────────────────────────

/** Large title first, then the search bar: the title scrolls away, the search pins at the top. */
export const Settings: Story = {
  render: (args) => (
    <Screen variant={args.variant}>
      <h1 class:x-large-title>Settings</h1>
      <header
        class:x-toolbar
        data-variant={args.variant}
        data-size={SEARCH_SIZE}
      >
        <Search placeholder="Search" variant={args.variant} />
      </header>
      <div>
        <Rows items={SETTINGS} />
      </div>
    </Screen>
  ),
};

/** Back + title + action, a segmented filter under the large title, a status bottom bar. */
export const Inbox: Story = {
  render: (args) => (
    <Screen variant={args.variant}>
      <header
        class:x-toolbar
        data-variant={args.variant}
        data-size={controlSize(args.variant)}
      >
        <Group variant={args.variant}>
          <BackButton variant={args.variant} label="Mailboxes" showLabel />
        </Group>
        <Title text="Inbox" />
        <Group variant={args.variant}>
          <TextButton variant={args.variant} label="Edit" />
        </Group>
      </header>
      <h1 class:x-large-title>Inbox</h1>
      <div>
        <Controls>
          <Segmented
            label="Filter"
            options={["All", "Unread", "Flagged"]}
            variant="surface"
          />
        </Controls>
        <Rows items={MAIL} />
      </div>
      <footer
        class:x-toolbar
        data-position="bottom"
        data-variant={args.variant}
        data-size={controlSize(args.variant)}
      >
        <Group variant={args.variant}>
          <IconButton
            variant={args.variant}
            label="Filter"
            name={ICONS.filter}
          />
        </Group>
        <Title text="Updated just now" />
        <Group variant={args.variant}>
          <IconButton
            variant={args.variant}
            label="Compose"
            name={ICONS.compose}
          />
        </Group>
      </footer>
    </Screen>
  ),
};

/** iOS 26 list: floating capsules, search and compose at the bottom. */
export const Notes: Story = {
  args: { variant: "soft" },
  render: (args) => (
    <Screen variant={args.variant}>
      <header
        class:x-toolbar
        data-variant={args.variant}
        data-size={controlSize(args.variant)}
      >
        <Group variant={args.variant}>
          <BackButton variant={args.variant} label="Folders" />
        </Group>
        <Group variant={args.variant}>
          <IconButton variant={args.variant} label="Share" name={ICONS.share} />
          <IconButton variant={args.variant} label="More" name={ICONS.more} />
        </Group>
      </header>
      <h1 class:x-large-title>Notes</h1>
      <div>
        <Rows items={NOTES} />
      </div>
      <footer
        class:x-toolbar
        data-position="bottom"
        data-variant={args.variant}
        data-size={SEARCH_SIZE}
      >
        <Search placeholder="Search notes" variant={args.variant} />
        <Group variant={args.variant}>
          <IconButton
            variant={args.variant}
            label="New note"
            name={ICONS.compose}
          />
        </Group>
      </footer>
    </Screen>
  ),
};

/** Bar only; a segmented control is the whole bottom bar. */
export const Photos: Story = {
  args: { variant: "soft" },
  render: (args) => (
    <Screen variant={args.variant}>
      <header
        class:x-toolbar
        data-variant={args.variant}
        data-size={controlSize(args.variant)}
      >
        <Title text="Library" />
        <Group variant={args.variant}>
          <TextButton variant={args.variant} label="Select" />
        </Group>
      </header>
      <div>
        <Rows items={DAYS} />
      </div>
      <footer
        class:x-toolbar
        data-position="bottom"
        data-variant={args.variant}
        data-size="3"
      >
        <Segmented
          label="Group by"
          options={["Years", "Months", "All"]}
          variant={args.variant}
          size="3"
          separators="none"
        />
      </footer>
    </Screen>
  ),
};

/** A stacked segmented control as the bottom tab bar. */
export const TabBar: Story = {
  args: { variant: "soft" },
  render: (args) => (
    <Screen variant={args.variant}>
      <header
        class:x-toolbar
        data-variant={args.variant}
        data-size={controlSize(args.variant)}
      >
        <Title text="Library" />
      </header>
      <h1 class:x-large-title>Library</h1>
      <div>
        <Rows items={NOTES} />
      </div>
      <footer
        class:x-toolbar
        data-position="bottom"
        data-variant={args.variant}
        data-size={controlSize(args.variant)}
      >
        <Tabs variant={args.variant} />
      </footer>
    </Screen>
  ),
};

/** A compose button in its own row, grouped with the bottom bar. */
export const Mail: Story = {
  args: { variant: "soft" },
  render: (args) => (
    <Screen variant={args.variant}>
      <header
        class:x-toolbar
        data-variant={args.variant}
        data-size={controlSize(args.variant)}
      >
        <Title text="Mail" />
        <Group variant={args.variant}>
          <TextButton variant={args.variant} label="Edit" />
        </Group>
      </header>
      <h1 class:x-large-title>Mail</h1>
      <div>
        <Rows items={MAIL} />
      </div>
      <footer
        class:x-toolbar
        data-position="bottom"
        data-variant={args.variant}
        data-size={controlSize(args.variant)}
      >
        {/* FAB row: an empty start region puts the button at the end */}
        <div class:x-toolbar>
          <div />
          <Group variant={args.variant}>
            <IconButton
              variant={args.variant}
              label="Compose"
              name={ICONS.compose}
            />
          </Group>
        </div>
        <div class:x-toolbar>
          <Group variant={args.variant}>
            <IconButton
              variant={args.variant}
              label="Filter"
              name={ICONS.filter}
            />
          </Group>
          <Title text="Updated just now" />
          <Group variant={args.variant}>
            <IconButton
              variant={args.variant}
              label="Search"
              name={ICONS.search}
            />
          </Group>
        </div>
      </footer>
    </Screen>
  ),
};

/** A grouped top bar: the title row and the search row stick as one. */
export const Files: Story = {
  args: { variant: "soft" },
  render: (args) => (
    <Screen variant={args.variant}>
      <header
        class:x-toolbar
        data-variant={args.variant}
        data-size={SEARCH_SIZE}
      >
        <div class:x-toolbar>
          <Group variant={args.variant}>
            <BackButton variant={args.variant} label="Browse" />
          </Group>
          <Title text="Recents" />
          <Group variant={args.variant}>
            <IconButton variant={args.variant} label="More" name={ICONS.more} />
          </Group>
        </div>
        <div class:x-toolbar>
          <Search placeholder="Search files" variant={args.variant} />
        </div>
      </header>
      <div>
        <Rows items={NOTES} />
      </div>
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
    <Screen variant={args.variant}>
      <header
        class:x-toolbar
        data-variant={args.variant}
        data-size={controlSize(args.variant)}
      >
        <div>
          <Group variant={args.variant}>
            <BackButton variant={args.variant} label="Back" />
          </Group>
          <Title text="Design Team" />
        </div>
        <Group variant={args.variant}>
          <IconButton
            variant={args.variant}
            label="Video call"
            name={ICONS.video}
          />
          <IconButton variant={args.variant} label="More" name={ICONS.more} />
        </Group>
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
    <Screen variant={args.variant}>
      <header
        class:x-toolbar
        data-variant={args.variant}
        data-size={controlSize(args.variant)}
      >
        <div>
          <Group variant={args.variant}>
            <BackButton variant={args.variant} label="Back" />
          </Group>
          <Title text="Q3 Report" />
        </div>
        <Group variant={args.variant} label="Tools">
          <IconButton variant={args.variant} label="Pen" name={ICONS.pen} />
          <IconButton variant={args.variant} label="Text" name={ICONS.text} />
          <IconButton
            variant={args.variant}
            label="Shapes"
            name={ICONS.shapes}
          />
        </Group>
        <Group variant={args.variant}>
          <IconButton variant={args.variant} label="Share" name={ICONS.share} />
          <IconButton variant={args.variant} label="More" name={ICONS.more} />
        </Group>
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
          <header
            class:x-toolbar
            data-variant={args.variant}
            data-size={SEARCH_SIZE}
          >
            <Search placeholder="Search" variant={args.variant} />
          </header>
          <div>
            <Rows items={repeat(SETTINGS, 60)} />
          </div>
        </section>
        <dom-lifecycle
          onConnect={() => {
            // view timelines drive the collapse in CSS; --scroll-y is the fallback
            if (CSS.supports("animation-timeline: view()")) return;
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
