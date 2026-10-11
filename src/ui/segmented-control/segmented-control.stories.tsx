import { StoryIcon, type IconName } from "../../../storybook/icon";
import type { Meta, StoryObj } from "@storybook/html-vite";

import "./segmented-control.css";

interface Args {
  variant: "surface" | "soft";
  size: "1" | "2" | "3";
  disabled: boolean;
  /** false sets data-separators="none" */
  separators?: boolean;
}

const OPTIONS = ["Day", "Week", "Month", "Year"] as const;

let groupId = 0;

const meta = {
  title: "UI/Segmented Control",
  argTypes: {
    variant: { control: "select", options: ["surface", "soft"] },
    size: { control: "select", options: ["1", "2", "3"] },
    disabled: { control: "boolean" },
    separators: { control: "boolean" },
  },
  args: { variant: "surface", size: "2", disabled: false, separators: true },
  render: (args) => {
    const name = `seg-${groupId++}`;
    return (
      <div
        class:unset
        class:x-segmented-control
        data-variant={args.variant}
        data-size={args.size}
        data-separators={args.separators === false ? "none" : undefined}
        data-disabled={args.disabled || undefined}
        role="radiogroup"
        aria-label="View"
      >
        {OPTIONS.map((opt, i) => (
          <label>
            <input
              type="radio"
              name={name}
              value={opt.toLowerCase()}
              checked={i === 0 || undefined}
              disabled={args.disabled || undefined}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = { args: { variant: "surface" } };
export const Soft: Story = { args: { variant: "soft" } };

export const Disabled: Story = { args: { disabled: true } };

// data-separators="none" — no hairlines between segments.
export const NoSeparators: Story = { args: { separators: false } };

const Icon = (props: { name: IconName }) => <StoryIcon name={props.name} />;

type Item = readonly [label: string, icon: IconName];

const VIEWS: Item[] = [
  ["List", "view_list"],
  ["Grid", "grid_view"],
  ["Board", "view_kanban"],
];

const TABS: Item[] = [
  ["Home", "home"],
  ["Search", "search"],
  ["Library", "local_library"],
  ["Profile", "person"],
];

/** Segments with an icon and, unless `iconOnly`, a label. */
const IconControl = (props: {
  args: Args;
  items: Item[];
  label: string;
  layout?: "stacked";
  iconOnly?: boolean;
}) => {
  const name = `seg-${groupId++}`;
  return (
    <div
      class:unset
      class:x-segmented-control
      data-variant={props.args.variant}
      data-size={props.args.size}
      data-layout={props.layout}
      data-separators={props.args.separators === false ? "none" : undefined}
      data-disabled={props.args.disabled || undefined}
      role="radiogroup"
      aria-label={props.label}
    >
      {props.items.map(([text, name], i) => (
        <label>
          <input
            type="radio"
            name={name}
            value={text.toLowerCase()}
            checked={i === 0 || undefined}
            disabled={props.args.disabled || undefined}
            aria-label={props.iconOnly ? text : undefined}
          />
          <Icon name={name} />
          {props.iconOnly ? null : <span>{text}</span>}
        </label>
      ))}
    </div>
  );
};

// Icon + label — a child before the label sits at the segment's start.
export const WithIcons: Story = {
  render: (args) => <IconControl args={args} items={VIEWS} label="View" />,
};

// Icon-only — name each radio with aria-label; the icon is decorative.
export const IconOnly: Story = {
  render: (args) => (
    <IconControl args={args} items={VIEWS} label="View" iconOnly />
  ),
};

// Stacked — data-layout="stacked" puts each icon above its label (tab-bar
// style); the control grows to fit.
export const Stacked: Story = {
  render: (args) => (
    <IconControl args={args} items={TABS} label="Section" layout="stacked" />
  ),
};

const SIZES = ["1", "2", "3"] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

// Full grid — sizes, variants, an explicit accent row, high contrast, and a
// disabled group.
export const Gallery: Story = {
  render: () =>
    (
      <div style="display: grid; gap: 28px; color: var(--neutral-12)">
        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Sizes
          </h3>
          <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start">
            {SIZES.map((size) => (
              <div
                class:unset
                class:x-segmented-control
                data-size={size}
                role="radiogroup"
                aria-label={`Size ${size}`}
              >
                {OPTIONS.map((opt, i) => (
                  <label>
                    <input
                      type="radio"
                      name={`g-size-${size}`}
                      value={opt.toLowerCase()}
                      checked={i === 0 || undefined}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Variants
          </h3>
          <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start">
            {VARIANTS.map((variant) => (
              <div
                class:unset
                class:x-segmented-control
                data-variant={variant}
                role="radiogroup"
                aria-label={variant}
              >
                {["Grid", "List", "Kanban"].map((opt, i) => (
                  <label>
                    <input
                      type="radio"
                      name={`g-variant-${variant}`}
                      value={opt.toLowerCase()}
                      checked={i === 0 || undefined}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Icons
          </h3>
          <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start">
            {SIZES.map((size) => (
              <IconControl
                args={{ variant: "surface", size, disabled: false }}
                items={VIEWS}
                label={`Icons, size ${size}`}
              />
            ))}
            <IconControl
              args={{ variant: "soft", size: "2", disabled: false }}
              items={VIEWS}
              label="Icon only"
              iconOnly
            />
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Stacked
          </h3>
          <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start">
            {SIZES.map((size) => (
              <IconControl
                args={{ variant: "surface", size, disabled: false }}
                items={TABS}
                label={`Stacked, size ${size}`}
                layout="stacked"
              />
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Accent colors
          </h3>
          <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start">
            {ACCENTS.map((accent) => (
              <div
                class:unset
                class:x-segmented-control
                data-variant="soft"
                data-accent={accent}
                role="radiogroup"
                aria-label={accent}
              >
                {["One", "Two", "Three"].map((opt, i) => (
                  <label>
                    <input
                      type="radio"
                      name={`g-accent-${accent}`}
                      value={opt.toLowerCase()}
                      checked={i === 1 || undefined}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            High contrast
          </h3>
          <div
            class:unset
            class:x-segmented-control
            data-high-contrast
            role="radiogroup"
            aria-label="High contrast"
          >
            {["Left", "Center", "Right"].map((opt, i) => (
              <label>
                <input
                  type="radio"
                  name="g-hc"
                  value={opt.toLowerCase()}
                  checked={i === 0 || undefined}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Disabled
          </h3>
          <div
            class:unset
            class:x-segmented-control
            data-disabled
            role="radiogroup"
            aria-label="Disabled"
          >
            {["One", "Two", "Three"].map((opt, i) => (
              <label>
                <input
                  type="radio"
                  name="g-disabled"
                  value={opt.toLowerCase()}
                  checked={i === 0 || undefined}
                  disabled
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
    ),
};
