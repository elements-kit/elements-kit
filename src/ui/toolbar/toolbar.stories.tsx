import type { Meta, StoryObj } from "@storybook/html-vite";
import { effect, effectScope } from "elements-kit/signals";

import { createElementScroll } from "../../utilities/element-scroll";
import { fromEvent, sync } from "../../utilities/event-driven";
import "../../utilities/dom-lifecycle";
import "../button/button.css";
import "./toolbar.css";
import { onCleanup } from "@/signals";

interface Args {
  title: string;
  titlePosition: "center" | "leading";
  toolbarVariant: "surface" | "soft";
  backButton: boolean;
  buttons: "text" | "icon";
  variant: "soft" | "text";
  largeTitle: boolean;
  largeTitleAlign: "start" | "center";
  largeTitleAccessory: boolean;
  bottomBar: boolean;
  bottomTitle: boolean;
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
  user: "M20 21a8 8 0 0 0-16 0M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
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
 * - surface: text icons size 3 (glyph on the 16px margin), soft size 2; 16px icons (kit default)
 */
const sizing = (args: Args, variant = args.variant) =>
  args.toolbarVariant === "soft"
    ? { size: "3" as ButtonSize, icon: 20 }
    : { size: (variant === "text" ? "3" : "2") as ButtonSize, icon: 16 };

const TextButton = (props: {
  label: string;
  variant: Args["variant"];
  size: ButtonSize;
}) => (
  <button
    class:unset
    class:x-button
    data-variant={props.variant}
    data-radius="pill"
    data-size={props.size}
  >
    {props.label}
  </button>
);

const IconButton = (props: {
  label: string;
  d: string;
  variant: Args["variant"];
  size: ButtonSize;
  icon: number;
}) => (
  <button
    class:unset
    class:x-button
    data-variant={props.variant}
    data-icon=""
    data-radius="pill"
    data-size={props.size}
    aria-label={props.label}
  >
    <Icon d={props.d} size={props.icon} />
  </button>
);

const isSoft = (args: Args) => args.toolbarVariant === "soft";

const Back = (props: { args: Args }) =>
  props.args.buttons === "icon" ? (
    <IconButton
      label="Back"
      d={ICONS.back}
      variant={props.args.variant}
      {...sizing(props.args)}
    />
  ) : (
    <TextButton
      label="Back"
      variant={props.args.variant}
      size={sizing(props.args).size}
    />
  );

/** Soft: each lone button gets its own wrapper, so it becomes a capsule. */
const BackItem = (props: { args: Args }) =>
  isSoft(props.args) ? (
    <div>
      <Back args={props.args} />
    </div>
  ) : (
    <Back args={props.args} />
  );

const Title = (props: { args: Args }) => (
  <span data-title="">{props.args.title}</span>
);

const Actions = (props: { args: Args }) =>
  props.args.buttons === "icon" ? (
    <div>
      <IconButton
        label="Search"
        d={ICONS.search}
        variant={props.args.variant}
        {...sizing(props.args)}
      />
      <IconButton
        label="More"
        d={ICONS.more}
        variant={props.args.variant}
        {...sizing(props.args)}
      />
    </div>
  ) : isSoft(props.args) ? (
    <div>
      <TextButton
        label="Edit"
        variant={props.args.variant}
        size={sizing(props.args).size}
      />
    </div>
  ) : (
    <TextButton
      label="Edit"
      variant={props.args.variant}
      size={sizing(props.args).size}
    />
  );

/** iPhone: [back] title [actions], or [back title] [actions]; back is optional */
const PhoneBar = (props: { args: Args }) =>
  props.args.titlePosition === "leading" ? (
    <header class:x-toolbar data-variant={props.args.toolbarVariant}>
      <div>
        {props.args.backButton ? <BackItem args={props.args} /> : null}
        <Title args={props.args} />
      </div>
      <Actions args={props.args} />
    </header>
  ) : (
    <header class:x-toolbar data-variant={props.args.toolbarVariant}>
      {props.args.backButton ? <BackItem args={props.args} /> : null}
      <Title args={props.args} />
      <Actions args={props.args} />
    </header>
  );

/** iPad (HIG item groupings): [back title] … [tools] … [share more] */
const IpadBar = (props: { args: Args }) => {
  const s = sizing(props.args);
  const back = (
    <IconButton label="Back" d={ICONS.back} variant={props.args.variant} {...s} />
  );
  return (
    <header class:x-toolbar data-variant={props.args.toolbarVariant}>
      <div>
        {isSoft(props.args) ? <div>{back}</div> : back}
        <Title args={props.args} />
      </div>
      <div role="group" aria-label="Tools">
        <IconButton label="Pen" d={ICONS.pen} variant={props.args.variant} {...s} />
        <IconButton label="Text" d={ICONS.text} variant={props.args.variant} {...s} />
        <IconButton
          label="Shapes"
          d={ICONS.shapes}
          variant={props.args.variant}
          {...s}
        />
      </div>
      <div>
        <IconButton
          label="Share"
          d={ICONS.share}
          variant={props.args.variant}
          {...s}
        />
        <IconButton label="More" d={ICONS.more} variant={props.args.variant} {...s} />
      </div>
    </header>
  );
};

/** Bottom toolbar: [share] … [tools or title] … [more]; text icons */
const BottomBar = (props: { args: Args }) => {
  const s = sizing(props.args, "text");
  return (
    <footer
      class:x-toolbar
      data-position="bottom"
      data-variant={props.args.toolbarVariant}
    >
      <div>
        <IconButton label="Share" d={ICONS.share} variant="text" {...s} />
      </div>
      {props.args.bottomTitle ? (
        <span data-title="">Updated just now</span>
      ) : (
        <div role="group" aria-label="Tools">
          <IconButton label="Pen" d={ICONS.pen} variant="text" {...s} />
          <IconButton label="Text" d={ICONS.text} variant="text" {...s} />
          <IconButton label="Shapes" d={ICONS.shapes} variant="text" {...s} />
        </div>
      )}
      <div>
        <IconButton label="More" d={ICONS.more} variant="text" {...s} />
      </div>
    </footer>
  );
};

/** Large title, optionally with an accessory (profile button) beside it. */
const Heading = (props: { args: Args }) =>
  props.args.largeTitleAccessory ? (
    <div class:x-large-title data-align={props.args.largeTitleAlign}>
      <h1 data-title="">{props.args.title}</h1>
      <IconButton
        label="Profile"
        d={ICONS.user}
        variant={props.args.variant}
        size="2"
        icon={16}
      />
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
    {props.args.bottomBar ? <BottomBar args={props.args} /> : null}
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
      <Content args={props.args} rows={30} device={props.device} />
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

const meta = {
  title: "UI/Toolbar",
  argTypes: {
    title: { control: "text" },
    titlePosition: { control: "select", options: ["center", "leading"] },
    toolbarVariant: { control: "inline-radio", options: ["surface", "soft"] },
    backButton: { control: "boolean" },
    buttons: { control: "select", options: ["text", "icon"] },
    variant: { control: "select", options: ["soft", "text"] },
    largeTitle: { control: "boolean" },
    largeTitleAlign: { control: "select", options: ["start", "center"] },
    largeTitleAccessory: { control: "boolean" },
    bottomBar: { control: "boolean" },
    bottomTitle: { control: "boolean" },
  },
  args: {
    title: "Settings",
    titlePosition: "center",
    toolbarVariant: "surface",
    backButton: true,
    buttons: "text",
    variant: "soft",
    largeTitle: true,
    largeTitleAlign: "start",
    largeTitleAccessory: false,
    bottomBar: false,
    bottomTitle: false,
  },
  render: (args) => <ScrollView args={args} device="phone" />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const LargeTitle: Story = {};

export const CenteredLargeTitle: Story = {
  args: { largeTitleAlign: "center" },
};

export const LongTitle: Story = {
  args: { title: "Notifications and Privacy Preferences" },
};

/** Accessory beside the large title; a long title truncates, the button keeps its size. */
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

export const IconButtons: Story = { args: { buttons: "icon" } };

/** Material-like: title next to back, icon buttons, no large title. */
export const IconButtonsLeading: Story = {
  args: { buttons: "icon", titlePosition: "leading", largeTitle: false },
};

/** iPad toolbar item groupings: [back title] … [tools] … [share more]. */
export const IPad: Story = {
  args: { title: "Q3 Report", largeTitle: false },
  render: (args) => <ScrollView args={args} device="ipad" />,
};

/** Soft (iOS 26) at the top: capsules for button groups, plain title, large title collapse. */
export const SoftToolbar: Story = {
  args: { toolbarVariant: "soft", buttons: "icon", variant: "text" },
};

/** Soft bottom toolbar: [share] … [tools] … [more]. Text buttons: the capsule is the background. */
export const BottomToolbar: Story = {
  args: { bottomBar: true, toolbarVariant: "soft", variant: "text" },
};

/** Soft bottom toolbar with a title in the center. */
export const BottomToolbarTitle: Story = {
  args: {
    bottomBar: true,
    bottomTitle: true,
    toolbarVariant: "soft",
    variant: "text",
  },
};

export const PageScroll: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => <PageView args={args} />,
};
