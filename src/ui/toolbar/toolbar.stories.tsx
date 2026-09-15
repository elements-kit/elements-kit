import type { Meta, StoryObj } from "@storybook/html-vite";
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
  // Toolbar
  toolbarVariant: "surface" | "soft";
  /** data-radius on the toolbars; "theme" = inherit the global radius */
  toolbarRadius: "theme" | "none" | "small" | "medium" | "large" | "pill";
  /** --toolbar-max-inline-size; empty = no limit */
  maxWidth: string;
  // Top bar
  title: string;
  titlePosition: "center" | "leading";
  /** what sits in the phone bar's center: the title or a segmented control */
  center: "title" | "segmented";
  backButton: boolean;
  // Buttons
  buttonContent: "text" | "icon";
  buttonVariant: "soft" | "text";
  // Large title
  largeTitle: boolean;
  largeTitleAlign: "start" | "center";
  largeTitleAccessory: boolean;
  // Bottom bar
  bottomBar: "none" | "actions" | "title" | "tools" | "search";
  // Content
  rows: number;
}

type Device = "phone" | "ipad";
type ButtonSize = "2" | "3";

/** Writes raw scroll (px) on `host`; toolbar.css turns it into progress. */
function driveScroll(host: HTMLElement, y: () => number) {
  const barTitle = host.querySelector<HTMLElement>(".x-toolbar [data-title]");
  const hasLargeTitle = host.querySelector(".x-large-title") !== null;

  effect(() => {
    host.style.setProperty("--scroll-y", `${y()}px`);
    // expanded: large title is the heading, bar title stays silent
    barTitle?.toggleAttribute("aria-hidden", hasLargeTitle && y() <= 0);
  });
  onCleanup(() => host.style.removeProperty("--scroll-y"));
}

// 24px grid, optically centered (Lucide shapes)
const ICONS = {
  back: "M15 18l-6-6 6-6",
  search: "M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM21 21l-4.3-4.3",
  more: "M6 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM20 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  pen: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
  text: "M4 7V4h16v3M9 20h6M12 4v16",
  shapes:
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
  share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
};

const Icon = (props: { d: string; size: number }) => (
  <svg
    width={String(props.size)}
    height={String(props.size)}
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

/**
 * Button + icon sizes per toolbar variant:
 * - soft: size 3 + 20px icon → 36px buttons → 44px capsules (iOS 26 glass buttons)
 * - surface: text buttons size 3 (glyph on the 16px margin), soft size 2; 16px icons (kit default)
 */
const sizing = (args: Args) =>
  args.toolbarVariant === "soft"
    ? { size: "3" as ButtonSize, icon: 20 }
    : { size: (args.buttonVariant === "text" ? "3" : "2") as ButtonSize, icon: 16 };

const isSoft = (args: Args) => args.toolbarVariant === "soft";

/** Attributes every toolbar in a story shares. */
const toolbarAttrs = (args: Args) => ({
  "data-variant": args.toolbarVariant,
  // undefined leaves the attribute off, so the theme radius applies
  "data-radius": args.toolbarRadius === "theme" ? undefined : args.toolbarRadius,
  // limit items to a centered width (large screens)
  style: `--toolbar-max-inline-size:${args.maxWidth || "100%"}`,
});

// buttons follow the radius around them (theme, or the toolbar's data-radius)
const TextButton = (props: { label: string; args: Args }) => (
  <button
    class:unset
    class:x-button
    data-variant={props.args.buttonVariant}
    data-size={sizing(props.args).size}
  >
    {props.label}
  </button>
);

const IconButton = (props: { label: string; d: string; args: Args }) => (
  <button
    class:unset
    class:x-button
    data-variant={props.args.buttonVariant}
    data-icon=""
    data-size={sizing(props.args).size}
    aria-label={props.label}
  >
    <Icon d={props.d} size={sizing(props.args).icon} />
  </button>
);

/** Icon or text, per the buttonContent control. */
const Button = (props: { label: string; d: string; args: Args }) =>
  props.args.buttonContent === "icon" ? (
    <IconButton label={props.label} d={props.d} args={props.args} />
  ) : (
    <TextButton label={props.label} args={props.args} />
  );

/** Soft: a lone button gets its own wrapper, so it becomes a capsule. */
const Item = (props: { label: string; d: string; args: Args }) =>
  isSoft(props.args) ? (
    <div>
      <Button label={props.label} d={props.d} args={props.args} />
    </div>
  ) : (
    <Button label={props.label} d={props.d} args={props.args} />
  );

const Title = (props: { text: string }) => <span data-title="">{props.text}</span>;

let segmentedId = 0;

/** Segmented control in the bar's center (iOS: filter a list without leaving the screen). */
const Segmented = () => {
  const name = `toolbar-seg-${segmentedId++}`;
  return (
    <div
      class:unset
      class:x-segmented-control
      data-size="2"
      role="radiogroup"
      aria-label="Mailbox"
    >
      {["Inbox", "Unread", "Flagged"].map((label, i) => (
        <label>
          <input
            type="radio"
            name={name}
            value={label.toLowerCase()}
            checked={i === 0 || undefined}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
};

/** Top bar trailing actions: [search more] as icons, or "Edit" as text. */
const Actions = (props: { args: Args }) =>
  props.args.buttonContent === "icon" ? (
    <div>
      <IconButton label="Search" d={ICONS.search} args={props.args} />
      <IconButton label="More" d={ICONS.more} args={props.args} />
    </div>
  ) : (
    <Item label="Edit" d={ICONS.pen} args={props.args} />
  );

/** iPhone: [back] title|segmented [actions], or [back title] [actions]; back is optional */
const PhoneBar = (props: { args: Args }) =>
  props.args.titlePosition === "leading" ? (
    <header class:x-toolbar {...toolbarAttrs(props.args)}>
      <div>
        {props.args.backButton ? (
          <Item label="Back" d={ICONS.back} args={props.args} />
        ) : null}
        <Title text={props.args.title} />
      </div>
      <Actions args={props.args} />
    </header>
  ) : (
    <header class:x-toolbar {...toolbarAttrs(props.args)}>
      {props.args.backButton ? (
        <Item label="Back" d={ICONS.back} args={props.args} />
      ) : null}
      {props.args.center === "segmented" ? (
        <Segmented />
      ) : (
        <Title text={props.args.title} />
      )}
      <Actions args={props.args} />
    </header>
  );

/** [pen text shapes] */
const Tools = (props: { args: Args }) => (
  <div role="group" aria-label="Tools">
    <IconButton label="Pen" d={ICONS.pen} args={props.args} />
    <IconButton label="Text" d={ICONS.text} args={props.args} />
    <IconButton label="Shapes" d={ICONS.shapes} args={props.args} />
  </div>
);

/** iPad (HIG item groupings): [back title] … [tools] … [share more] */
const IpadBar = (props: { args: Args }) => {
  const back = <IconButton label="Back" d={ICONS.back} args={props.args} />;
  return (
    <header class:x-toolbar {...toolbarAttrs(props.args)}>
      <div>
        {isSoft(props.args) ? <div>{back}</div> : back}
        <Title text={props.args.title} />
      </div>
      <Tools args={props.args} />
      <div>
        <IconButton label="Share" d={ICONS.share} args={props.args} />
        <IconButton label="More" d={ICONS.more} args={props.args} />
      </div>
    </header>
  );
};

/** Search field that fills its column (iOS 26: search at the bottom of the screen). */
const Search = (props: { args: Args }) => (
  <div class:x-text-input data-variant="surface" data-size={sizing(props.args).size}>
    {/* affix: text-input pads non-input children, so the icon needs its own wrapper */}
    <span>
      <Icon d={ICONS.search} size={16} />
    </span>
    <input class:unset type="search" placeholder="Search" aria-label="Search" />
  </div>
);

/**
 * Bottom toolbar (bottomBar control):
 *   actions  [share] … [tools] … [more]
 *   title    [share] … title … [more]
 *   tools    [tools] alone, centered
 *   search   [search ─────────] [compose]
 */
const BottomBar = (props: { args: Args }) => {
  const { args } = props;
  const attrs = { "data-position": "bottom", ...toolbarAttrs(args) };
  const share = (
    <div>
      <IconButton label="Share" d={ICONS.share} args={args} />
    </div>
  );
  const more = (
    <div>
      <IconButton label="More" d={ICONS.more} args={args} />
    </div>
  );
  switch (args.bottomBar) {
    case "search":
      return (
        <footer class:x-toolbar {...attrs}>
          <div>
            <Search args={args} />
          </div>
          <div>
            <IconButton label="Compose" d={ICONS.pen} args={args} />
          </div>
        </footer>
      );
    case "tools":
      return (
        <footer class:x-toolbar {...attrs}>
          <Tools args={args} />
        </footer>
      );
    case "title":
      return (
        <footer class:x-toolbar {...attrs}>
          {share}
          <Title text="Updated just now" />
          {more}
        </footer>
      );
    default:
      return (
        <footer class:x-toolbar {...attrs}>
          {share}
          <Tools args={args} />
          {more}
        </footer>
      );
  }
};

/** Large title, optionally with an accessory (profile avatar) beside it. */
const Heading = (props: { args: Args }) =>
  props.args.largeTitleAccessory ? (
    <div class:x-large-title data-align={props.args.largeTitleAlign}>
      <h1 data-title="">{props.args.title}</h1>
      {/* avatar is not interactive: a bare button makes it tappable; size 3 = 40px = the title line.
          display:flex drops the inline line box, so the row stays one title line tall */}
      <button class:unset aria-label="Profile" style="display:flex">
        <span class:x-avatar data-size="3" data-variant="soft">
          <span class:x-avatar-fallback>AK</span>
        </span>
      </button>
    </div>
  ) : (
    <h1 class:x-large-title data-align={props.args.largeTitleAlign}>
      {props.args.title}
    </h1>
  );

// one wrapper after the large title (see toolbar.css): the list scrolls free past the collapse
const Rows = (props: { count: number }) => (
  <div>
    {Array.from({ length: props.count }, (_, i) => (
      <p style="display:flex;align-items:center;gap:var(--space-3);margin:0;padding:var(--space-3) var(--space-4);box-shadow:inset 0 -1px var(--neutral-a3)">
        {/* colored swatch: shows what the translucent bar lets through */}
        <span
          style={`width:var(--space-7);height:var(--space-7);border-radius:var(--radius-3);flex:none;background:oklch(0.72 0.14 ${(i * 37) % 360})`}
        />
        Row {i + 1}
      </p>
    ))}
  </div>
);

const Content = (props: { args: Args; rows: number; device: Device }) => (
  <>
    {props.device === "ipad" ? (
      <IpadBar args={props.args} />
    ) : (
      <PhoneBar args={props.args} />
    )}
    {props.args.largeTitle ? <Heading args={props.args} /> : null}
    <Rows count={props.rows} />
    {props.args.bottomBar !== "none" ? <BottomBar args={props.args} /> : null}
  </>
);

/** An element scrolls: --scroll-y lives on the container. */
function ScrollView(props: { args: Args; device: Device }) {
  let stop: (() => void) | undefined;
  onCleanup(() => stop?.());
  const width = props.device === "ipad" ? 1024 : 390;
  return (
    <div
      ref={(el) => {
        stop = effectScope(() => driveScroll(el, createElementScroll(el).y));
      }}
      style={`height:560px;max-width:${width}px;overflow:auto;border-radius:var(--radius-5);box-shadow:0 0 0 1px var(--neutral-a5)`}
    >
      <Content args={props.args} rows={props.args.rows} device={props.device} />
    </div>
  );
}

/** The page scrolls: bar nested in the app (main > section), --scroll-y lives on <html>. */
function PageView(props: { args: Args }) {
  let stop: (() => void) | undefined;
  return (
    <main>
      <section>
        <Content args={props.args} rows={60} device="phone" />
      </section>
      <dom-lifecycle
        onConnect={() => {
          stop = effectScope(() => {
            const [y] = sync(fromEvent(window, "scroll"), () => window.scrollY);
            driveScroll(document.documentElement, y);
          });
        }}
        onDisconnect={() => stop?.()}
      />
    </main>
  );
}

const group = (category: string) => ({ table: { category } });

const meta = {
  title: "UI/Toolbar",
  argTypes: {
    // Toolbar
    toolbarVariant: {
      control: "inline-radio",
      options: ["surface", "soft"],
      description: "surface: material bar · soft: no bar, capsules, gradient blur",
      ...group("Toolbar"),
    },
    toolbarRadius: {
      control: "select",
      options: ["theme", "none", "small", "medium", "large", "pill"],
      description: "data-radius on the toolbars (theme = inherit the global radius)",
      ...group("Toolbar"),
    },
    maxWidth: {
      control: "text",
      description: "--toolbar-max-inline-size, e.g. 640px (empty = no limit)",
      ...group("Toolbar"),
    },
    // Top bar
    title: { control: "text", ...group("Top bar") },
    titlePosition: {
      control: "inline-radio",
      options: ["center", "leading"],
      ...group("Top bar"),
    },
    center: {
      control: "inline-radio",
      options: ["title", "segmented"],
      description: "what sits in the center (centered title position only)",
      ...group("Top bar"),
    },
    backButton: { control: "boolean", ...group("Top bar") },
    // Buttons
    buttonContent: {
      control: "inline-radio",
      options: ["text", "icon"],
      description: "top bar buttons: text labels or icons",
      ...group("Buttons"),
    },
    buttonVariant: {
      control: "inline-radio",
      options: ["soft", "text"],
      description: "x-button variant for every toolbar button",
      ...group("Buttons"),
    },
    // Large title
    largeTitle: { control: "boolean", ...group("Large title") },
    largeTitleAlign: {
      control: "inline-radio",
      options: ["start", "center"],
      ...group("Large title"),
    },
    largeTitleAccessory: {
      control: "boolean",
      description: "avatar beside the large title",
      ...group("Large title"),
    },
    // Bottom bar
    bottomBar: {
      control: "select",
      options: ["none", "actions", "title", "tools", "search"],
      description:
        "actions: share · tools · more · title: share · title · more · tools: centered · search: field + compose",
      ...group("Bottom bar"),
    },
    // Content
    rows: {
      control: { type: "number", min: 0, max: 60 },
      ...group("Content"),
    },
  },
  args: {
    toolbarVariant: "surface",
    toolbarRadius: "theme",
    maxWidth: "",
    title: "Settings",
    titlePosition: "center",
    center: "title",
    backButton: true,
    buttonContent: "text",
    buttonVariant: "soft",
    largeTitle: true,
    largeTitleAlign: "start",
    largeTitleAccessory: false,
    bottomBar: "none",
    rows: 30,
  },
  render: (args) => <ScrollView args={args} device="phone" />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

// ── Top bar ──────────────────────────────────────────────────────────────────

export const LargeTitle: Story = {};

export const CenteredLargeTitle: Story = {
  args: { largeTitleAlign: "center" },
};

export const LongTitle: Story = {
  args: { title: "Notifications and Privacy Preferences" },
};

/** Avatar beside the large title; a long title truncates, the avatar keeps its size. */
export const LargeTitleAccessory: Story = {
  args: {
    title: "Notifications and Privacy Preferences",
    largeTitleAccessory: true,
  },
};

export const BarOnly: Story = { args: { largeTitle: false } };

export const LeadingTitle: Story = { args: { titlePosition: "leading" } };

/** Leading title with no back button: the title sits on the content margin. */
export const LeadingTitleNoBack: Story = {
  args: { titlePosition: "leading", backButton: false, largeTitle: false },
};

export const IconButtons: Story = { args: { buttonContent: "icon" } };

/** Material-like: title next to back, icon buttons, no large title. */
export const IconButtonsLeading: Story = {
  args: { buttonContent: "icon", titlePosition: "leading", largeTitle: false },
};

/** Segmented control in the bar's center instead of a title. */
export const SegmentedControl: Story = {
  args: { center: "segmented", largeTitle: false, buttonContent: "icon" },
};

// ── Soft (iOS 26) ────────────────────────────────────────────────────────────

/** Capsules for button groups, plain title, gradient blur, large title collapse. */
export const SoftToolbar: Story = {
  args: { toolbarVariant: "soft", buttonContent: "icon", buttonVariant: "text" },
};

/** Toolbar-level radius: pill capsules and buttons, whatever the theme radius. */
export const SoftToolbarPill: Story = {
  args: {
    toolbarVariant: "soft",
    buttonContent: "icon",
    buttonVariant: "text",
    bottomBar: "actions",
    toolbarRadius: "pill",
  },
};

// ── Bottom bar ───────────────────────────────────────────────────────────────

/** [share] … [tools] … [more]. Text buttons: the capsule is the background. */
export const BottomToolbar: Story = {
  args: { bottomBar: "actions", toolbarVariant: "soft", buttonVariant: "text" },
};

/** A title in the center of the bottom bar. */
export const BottomToolbarTitle: Story = {
  args: { bottomBar: "title", toolbarVariant: "soft", buttonVariant: "text" },
};

/** Bottom search (iOS 26): the field fills the bar, a compose button beside it. */
export const SearchToolbar: Story = {
  args: { bottomBar: "search", toolbarVariant: "soft", buttonVariant: "text" },
};

/** Short content: the bottom toolbar still sits at the bottom of the container. */
export const BottomToolbarShort: Story = {
  args: {
    bottomBar: "actions",
    toolbarVariant: "soft",
    buttonVariant: "text",
    rows: 2,
  },
};

// ── iPad / page ──────────────────────────────────────────────────────────────

/** iPad toolbar item groupings: [back title] … [tools] … [share more]. */
export const IPad: Story = {
  args: { title: "Q3 Report", largeTitle: false },
  render: (args) => <ScrollView args={args} device="ipad" />,
};

/** Large screen: items kept within a centered 640px; the bottom bar holds only the tools. */
export const IPadCenteredToolbar: Story = {
  args: {
    title: "Q3 Report",
    largeTitle: false,
    toolbarVariant: "soft",
    buttonVariant: "text",
    bottomBar: "tools",
    maxWidth: "640px",
  },
  render: (args) => <ScrollView args={args} device="ipad" />,
};

export const PageScroll: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => <PageView args={args} />,
};
