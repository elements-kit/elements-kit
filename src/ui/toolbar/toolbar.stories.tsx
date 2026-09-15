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

type Variant = "surface" | "soft";

interface Args {
  // Top bar
  topBar: "center" | "leading" | "none";
  topVariant: Variant;
  title: string;
  back: boolean;
  /** a second bar stacked under the top bar */
  stack: "none" | "search" | "segmented";
  // Large title
  largeTitle: boolean;
  largeTitleAlign: "start" | "center";
  avatar: boolean;
  // Bottom bar
  bottomBar: "none" | "actions" | "title" | "tools" | "search" | "segmented";
  bottomVariant: Variant;
  // Buttons
  buttonContent: "text" | "icon";
  /** surface bars only: soft bars always use text buttons (the capsule is the background) */
  buttonVariant: "soft" | "text";
  // Layout
  /** data-radius on the toolbars; "theme" = inherit the global radius */
  toolbarRadius: "theme" | "none" | "small" | "medium" | "large" | "pill";
  /** --toolbar-max-inline-size; empty = no limit */
  maxWidth: string;
  rows: number;
}

/** One bar: the story args plus that bar's own variant. */
interface Bar {
  args: Args;
  variant: Variant;
}

type Device = "phone" | "ipad";

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

/** Sized by the surrounding font-size (button or input size). */
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

const isSoft = (bar: Bar) => bar.variant === "soft";

/** Soft bars: text buttons, the capsule is their background. */
const buttonVariant = (bar: Bar) =>
  isSoft(bar) ? "text" : bar.args.buttonVariant;

/** Attributes every toolbar shares. */
const toolbarAttrs = (bar: Bar) => ({
  "data-variant": bar.variant,
  // undefined leaves the attribute off, so the theme radius applies
  "data-radius":
    bar.args.toolbarRadius === "theme" ? undefined : bar.args.toolbarRadius,
  // limit items to a centered width (large screens)
  style: `--toolbar-max-inline-size:${bar.args.maxWidth || "100%"}`,
});

// buttons follow the radius around them (theme, or the toolbar's data-radius)
const TextButton = (props: { label: string; bar: Bar }) => (
  <button
    class:unset
    class:x-button
    data-variant={buttonVariant(props.bar)}
    data-size="2"
  >
    {props.label}
  </button>
);

const IconButton = (props: { label: string; d: string; bar: Bar }) => (
  <button
    class:unset
    class:x-button
    data-variant={buttonVariant(props.bar)}
    data-icon=""
    data-size="2"
    aria-label={props.label}
  >
    <Icon d={props.d} />
  </button>
);

/** Icon or text, per the Buttons › content control. */
const Button = (props: { label: string; d: string; bar: Bar }) =>
  props.bar.args.buttonContent === "icon" ? (
    <IconButton label={props.label} d={props.d} bar={props.bar} />
  ) : (
    <TextButton label={props.label} bar={props.bar} />
  );

/** Soft: a lone button gets its own wrapper, so it becomes a capsule. */
const Item = (props: { label: string; d: string; bar: Bar }) =>
  isSoft(props.bar) ? (
    <div>
      <Button label={props.label} d={props.d} bar={props.bar} />
    </div>
  ) : (
    <Button label={props.label} d={props.d} bar={props.bar} />
  );

const Title = (props: { text: string }) => (
  <span data-title="">{props.text}</span>
);

let segmentedId = 0;

/** Filters a list without leaving the screen: stacked under the top bar, or as the bottom bar. */
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

/** Search field that fills its region. */
const Search = () => (
  <div class:x-text-input data-variant="surface" data-size="2">
    {/* affix: text-input pads non-input children, so the icon needs its own wrapper */}
    <span>
      <Icon d={ICONS.search} />
    </span>
    <input class:unset type="search" placeholder="Search" aria-label="Search" />
  </div>
);

/** Top bar trailing actions: [search more] as icons, or "Edit" as text. */
const Actions = (props: { bar: Bar }) =>
  props.bar.args.buttonContent === "icon" ? (
    <div>
      <IconButton label="Search" d={ICONS.search} bar={props.bar} />
      <IconButton label="More" d={ICONS.more} bar={props.bar} />
    </div>
  ) : (
    <Item label="Edit" d={ICONS.pen} bar={props.bar} />
  );

/** iPhone: [back] title [actions], or [back title] [actions]; back is optional */
const PhoneBar = (props: { bar: Bar }) => {
  const { args } = props.bar;
  const back = args.back ? (
    <Item label="Back" d={ICONS.back} bar={props.bar} />
  ) : null;
  return args.topBar === "leading" ? (
    <header class:x-toolbar {...toolbarAttrs(props.bar)}>
      <div>
        {back}
        <Title text={args.title} />
      </div>
      <Actions bar={props.bar} />
    </header>
  ) : (
    <header class:x-toolbar {...toolbarAttrs(props.bar)}>
      {back}
      <Title text={args.title} />
      <Actions bar={props.bar} />
    </header>
  );
};

/** [pen text shapes] */
const Tools = (props: { bar: Bar }) => (
  <div role="group" aria-label="Tools">
    <IconButton label="Pen" d={ICONS.pen} bar={props.bar} />
    <IconButton label="Text" d={ICONS.text} bar={props.bar} />
    <IconButton label="Shapes" d={ICONS.shapes} bar={props.bar} />
  </div>
);

/** iPad (HIG item groupings): [back title] … [tools] … [share more] */
const IpadBar = (props: { bar: Bar }) => {
  const back = <IconButton label="Back" d={ICONS.back} bar={props.bar} />;
  return (
    <header class:x-toolbar {...toolbarAttrs(props.bar)}>
      <div>
        {isSoft(props.bar) ? <div>{back}</div> : back}
        <Title text={props.bar.args.title} />
      </div>
      <Tools bar={props.bar} />
      <div>
        <IconButton label="Share" d={ICONS.share} bar={props.bar} />
        <IconButton label="More" d={ICONS.more} bar={props.bar} />
      </div>
    </header>
  );
};

/** A second bar right after the top bar: pins under it, shares its background. */
const StackBar = (props: { bar: Bar }) => (
  <div class:x-toolbar {...toolbarAttrs(props.bar)}>
    {props.bar.args.stack === "search" ? <Search /> : <Segmented />}
  </div>
);

/**
 * Bottom toolbar (Bottom bar › content):
 *   actions    [share] … [tools] … [more]
 *   title      [share] … title … [more]
 *   tools      [tools] alone, centered
 *   search     [search ─────────] [compose]
 *   segmented  segmented control alone, centered
 */
const BottomBar = (props: { bar: Bar }) => {
  const { bar } = props;
  const attrs = { "data-position": "bottom", ...toolbarAttrs(bar) };
  const share = (
    <div>
      <IconButton label="Share" d={ICONS.share} bar={bar} />
    </div>
  );
  const more = (
    <div>
      <IconButton label="More" d={ICONS.more} bar={bar} />
    </div>
  );
  switch (bar.args.bottomBar) {
    case "search":
      return (
        <footer class:x-toolbar {...attrs}>
          <div>
            <Search />
          </div>
          <div>
            <IconButton label="Compose" d={ICONS.pen} bar={bar} />
          </div>
        </footer>
      );
    case "segmented":
      return (
        <footer class:x-toolbar {...attrs}>
          <Segmented />
        </footer>
      );
    case "tools":
      return (
        <footer class:x-toolbar {...attrs}>
          <Tools bar={bar} />
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
          <Tools bar={bar} />
          {more}
        </footer>
      );
  }
};

/** Large title, optionally with a profile avatar beside it. */
const Heading = (props: { args: Args }) =>
  props.args.avatar ? (
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

const Content = (props: { args: Args; rows: number; device: Device }) => {
  const { args } = props;
  const top: Bar = { args, variant: args.topVariant };
  const bottom: Bar = { args, variant: args.bottomVariant };
  return (
    <>
      {args.topBar === "none" ? null : props.device === "ipad" ? (
        <IpadBar bar={top} />
      ) : (
        <PhoneBar bar={top} />
      )}
      {args.stack === "none" ? null : <StackBar bar={top} />}
      {args.largeTitle ? <Heading args={args} /> : null}
      <Rows count={props.rows} />
      {args.bottomBar === "none" ? null : <BottomBar bar={bottom} />}
    </>
  );
};

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

/** Control label (shown without the group prefix the key needs) and group. */
const arg = (category: string, name: string) => ({
  name,
  table: { category },
});

const variantControl = {
  control: "inline-radio" as const,
  options: ["surface", "soft"],
  description:
    "surface: material bar + hairline · soft: no bar, capsules, gradient blur",
};

const meta = {
  title: "UI/Toolbar",
  argTypes: {
    // Top bar
    topBar: {
      control: "inline-radio",
      options: ["center", "leading", "none"],
      description: "title centered or next to back · none: large title only",
      ...arg("Top bar", "layout"),
    },
    topVariant: { ...variantControl, ...arg("Top bar", "variant") },
    title: {
      control: "text",
      description: "bar and large title",
      ...arg("Top bar", "title"),
    },
    back: { control: "boolean", ...arg("Top bar", "back") },
    stack: {
      control: "inline-radio",
      options: ["none", "search", "segmented"],
      description:
        "a second .x-toolbar right after the top bar: pins under it, one shared background",
      ...arg("Top bar", "stack"),
    },
    // Large title
    largeTitle: { control: "boolean", ...arg("Large title", "visible") },
    largeTitleAlign: {
      control: "inline-radio",
      options: ["start", "center"],
      ...arg("Large title", "align"),
    },
    avatar: {
      control: "boolean",
      description: "profile avatar beside the large title",
      ...arg("Large title", "avatar"),
    },
    // Bottom bar
    bottomBar: {
      control: "select",
      options: ["none", "actions", "title", "tools", "search", "segmented"],
      description:
        "actions: share · tools · more · title: share · title · more · tools: centered · search: field + compose · segmented: centered",
      ...arg("Bottom bar", "content"),
    },
    bottomVariant: { ...variantControl, ...arg("Bottom bar", "variant") },
    // Buttons
    buttonContent: {
      control: "inline-radio",
      options: ["text", "icon"],
      description: "top bar buttons: text labels or icons",
      ...arg("Buttons", "content"),
    },
    buttonVariant: {
      control: "inline-radio",
      options: ["text", "soft"],
      description:
        "x-button variant in surface bars (soft bars always use text buttons)",
      ...arg("Buttons", "variant"),
    },
    // Layout
    toolbarRadius: {
      control: "select",
      options: ["theme", "none", "small", "medium", "large", "pill"],
      description:
        "data-radius on the toolbars (theme = inherit the global radius)",
      ...arg("Layout", "radius"),
    },
    maxWidth: {
      control: "text",
      description: "--toolbar-max-inline-size, e.g. 640px (empty = no limit)",
      ...arg("Layout", "maxWidth"),
    },
    rows: {
      control: { type: "number", min: 0, max: 60 },
      ...arg("Layout", "rows"),
    },
  },
  args: {
    topBar: "center",
    topVariant: "surface",
    title: "Settings",
    back: true,
    stack: "none",
    largeTitle: true,
    largeTitleAlign: "start",
    avatar: false,
    bottomBar: "none",
    bottomVariant: "surface",
    buttonContent: "text",
    buttonVariant: "text",
    toolbarRadius: "theme",
    maxWidth: "",
    rows: 30,
  },
  render: (args) => <ScrollView args={args} device="phone" />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

/** Floating look: soft bars with icon buttons. */
const soft = {
  topVariant: "soft",
  bottomVariant: "soft",
  buttonContent: "icon",
} satisfies Partial<Args>;

// ── Top bar ──────────────────────────────────────────────────────────────────

export const LargeTitle: Story = {};

export const CenteredLargeTitle: Story = {
  args: { largeTitleAlign: "center" },
};

export const LongTitle: Story = {
  args: { title: "Notifications and Privacy Preferences" },
};

/** Avatar beside the large title; a long title truncates, the avatar keeps its size. */
export const LargeTitleAvatar: Story = {
  args: { title: "Notifications and Privacy Preferences", avatar: true },
};

/** Centered large title with an avatar: the title centers on the whole row. */
export const CenteredLargeTitleAvatar: Story = {
  args: { largeTitleAlign: "center", avatar: true },
};

/** No top bar: only the large title, scrolling away with the content. */
export const TitleOnly: Story = {
  args: { topBar: "none", title: "Today", avatar: true },
};

export const BarOnly: Story = { args: { largeTitle: false } };

export const LeadingTitle: Story = { args: { topBar: "leading" } };

/** Leading title with no back button: the title sits on the content margin. */
export const LeadingTitleNoBack: Story = {
  args: { topBar: "leading", back: false, largeTitle: false },
};

export const IconButtons: Story = { args: { buttonContent: "icon" } };

/** Material-like: title next to back, icon buttons, no large title. */
export const IconButtonsLeading: Story = {
  args: { buttonContent: "icon", topBar: "leading", largeTitle: false },
};

// ── Stacked bars ─────────────────────────────────────────────────────────────

/** Search bar stacked under the top bar; the large title collapses under both. */
export const SearchStack: Story = {
  args: { stack: "search", buttonContent: "icon" },
};

/** Segmented control stacked under the top bar. */
export const SegmentedStack: Story = {
  args: { stack: "segmented", title: "Mail", largeTitle: false },
};

export const SoftSearchStack: Story = {
  args: { ...soft, stack: "search" },
};

// ── Soft (iOS 26) ────────────────────────────────────────────────────────────

/** Capsules for button groups, plain title, gradient blur, large title collapse. */
export const SoftToolbar: Story = {
  args: { ...soft, bottomBar: "actions" },
};

/** Toolbar-level radius: pill capsules and buttons, whatever the theme radius. */
export const SoftToolbarPill: Story = {
  args: { ...soft, bottomBar: "actions", toolbarRadius: "pill" },
};

/** Each bar has its own variant: surface on top, soft at the bottom. */
export const MixedVariants: Story = {
  args: { bottomBar: "actions", bottomVariant: "soft" },
};

// ── Bottom bar ───────────────────────────────────────────────────────────────

/** [share] … [tools] … [more]. */
export const BottomToolbar: Story = {
  args: { bottomBar: "actions" },
};

/** A title in the center of the bottom bar. */
export const BottomToolbarTitle: Story = {
  args: { ...soft, bottomBar: "title" },
};

/** Bottom search (iOS 26): the field fills the bar, a compose button beside it. */
export const SearchToolbar: Story = {
  args: { ...soft, bottomBar: "search" },
};

/** Segmented control as the bottom bar. */
export const SegmentedToolbar: Story = {
  args: { ...soft, bottomBar: "segmented", title: "Mail" },
};

/** Short content: the bottom toolbar still sits at the bottom of the container. */
export const BottomToolbarShort: Story = {
  args: { ...soft, bottomBar: "actions", rows: 2 },
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
    ...soft,
    title: "Q3 Report",
    largeTitle: false,
    bottomBar: "tools",
    maxWidth: "640px",
  },
  render: (args) => <ScrollView args={args} device="ipad" />,
};

export const PageScroll: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => <PageView args={args} />,
};
