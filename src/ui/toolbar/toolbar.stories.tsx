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
  buttons: "text" | "icon";
  variant: "soft" | "text";
  largeTitle: boolean;
  largeTitleAlign: "start" | "center";
}

type Device = "phone" | "ipad";

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

// 16px: the kit's icon size for default buttons (see group, alert stories)
const Icon = (props: { d: string }) => (
  <svg
    width="16"
    height="16"
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

const TextButton = (props: { label: string; variant: Args["variant"] }) => (
  <button
    class:unset
    class:x-button
    data-variant={props.variant}
    data-radius="pill"
  >
    {props.label}
  </button>
);

const IconButton = (props: {
  label: string;
  d: string;
  variant: Args["variant"];
}) => (
  <button
    class:unset
    class:x-button
    data-variant={props.variant}
    data-icon=""
    data-radius="pill"
    aria-label={props.label}
  >
    <Icon d={props.d} />
  </button>
);

const Back = (props: { args: Args }) =>
  props.args.buttons === "icon" ? (
    <IconButton label="Back" d={ICONS.back} variant={props.args.variant} />
  ) : (
    <TextButton label="Back" variant={props.args.variant} />
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
      />
      <IconButton
        label="More"
        d={ICONS.more}
        variant={props.args.variant}
      />
    </div>
  ) : (
    <TextButton label="Edit" variant={props.args.variant} />
  );

/** iPhone: [back] title [actions], or [back title] [actions] */
const PhoneBar = (props: { args: Args }) =>
  props.args.titlePosition === "leading" ? (
    <header class:x-toolbar>
      <div>
        <Back args={props.args} />
        <Title args={props.args} />
      </div>
      <Actions args={props.args} />
    </header>
  ) : (
    <header class:x-toolbar>
      <Back args={props.args} />
      <Title args={props.args} />
      <Actions args={props.args} />
    </header>
  );

/** iPad (HIG item groupings): [back title] … [tools] … [share more] */
const IpadBar = (props: { args: Args }) => (
  <header class:x-toolbar>
    <div>
      <IconButton
        label="Back"
        d={ICONS.back}
        variant={props.args.variant}
      />
      <Title args={props.args} />
    </div>
    <div role="group" aria-label="Tools">
      <IconButton label="Pen" d={ICONS.pen} variant={props.args.variant} />
      <IconButton
        label="Text"
        d={ICONS.text}
        variant={props.args.variant}
      />
      <IconButton
        label="Shapes"
        d={ICONS.shapes}
        variant={props.args.variant}
      />
    </div>
    <div>
      <IconButton
        label="Share"
        d={ICONS.share}
        variant={props.args.variant}
      />
      <IconButton
        label="More"
        d={ICONS.more}
        variant={props.args.variant}
      />
    </div>
  </header>
);

const Heading = (props: { args: Args }) => (
  <h1 class:x-large-title data-align={props.args.largeTitleAlign}>
    {props.args.title}
  </h1>
);

// one wrapper after the large title (see toolbar.css): the list scrolls free past the collapse
const Rows = (props: { count: number }) => (
  <div>
    {Array.from({ length: props.count }, (_, i) => (
      <p style="margin:0;padding:var(--space-3) var(--space-4);box-shadow:inset 0 -1px var(--neutral-a3)">
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

/** The page scrolls: bar sits in the app root, --scroll-y lives on <html>. */
function PageView(props: { args: Args }) {
  let stop: (() => void) | undefined;
  return (
    <>
      <Content args={props.args} rows={60} device="phone" />
      <dom-lifecycle
        onConnect={() => {
          stop = effectScope(() => {
            const [y] = sync(fromEvent(window, "scroll"), () => window.scrollY);
            driveScroll(document.documentElement, y);
          });
        }}
        onDisconnect={() => stop?.()}
      />
    </>
  );
}

const meta = {
  title: "UI/Toolbar",
  argTypes: {
    title: { control: "text" },
    titlePosition: { control: "select", options: ["center", "leading"] },
    buttons: { control: "select", options: ["text", "icon"] },
    variant: { control: "select", options: ["soft", "text"] },
    largeTitle: { control: "boolean" },
    largeTitleAlign: { control: "select", options: ["start", "center"] },
  },
  args: {
    title: "Settings",
    titlePosition: "center",
    buttons: "text",
    variant: "soft",
    largeTitle: true,
    largeTitleAlign: "start",
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

export const BarOnly: Story = { args: { largeTitle: false } };

export const LeadingTitle: Story = { args: { titlePosition: "leading" } };

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

export const PageScroll: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => <PageView args={args} />,
};
