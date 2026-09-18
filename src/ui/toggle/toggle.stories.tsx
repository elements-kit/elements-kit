import { StoryIcon } from "../../../storybook/icon";
import type { Meta, StoryObj } from "@storybook/html-vite";

import "./toggle.css";

interface Args {
  label: string;
  variant: "surface" | "soft" | "borderless";
  size: "1" | "2" | "3";
  checked: boolean;
  disabled: boolean;
}

const meta = {
  title: "UI/Toggle",
  argTypes: {
    label: { control: "text" },
    variant: { control: "select", options: ["surface", "soft", "borderless"] },
    size: { control: "select", options: ["1", "2", "3"] },
    checked: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Toggle",
    variant: "surface",
    size: "2",
    checked: false,
    disabled: false,
  },
  render: (args) => (
    <label class:x-toggle data-variant={args.variant} data-size={args.size}>
      <input
        type="checkbox"
        class:unset
        checked={args.checked || undefined}
        disabled={args.disabled || undefined}
      />
      {args.label}
    </label>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = { args: { variant: "surface", checked: true } };
export const Soft: Story = { args: { variant: "soft", checked: true } };

// Binary toggle — a single checkbox. Pressed state is driven by
// :has(input:checked); no JavaScript.
export const Binary: Story = {
  render: (args) => (
    <label class:x-toggle data-variant={args.variant} data-size={args.size}>
      <input type="checkbox" class:unset checked />
      Bold
    </label>
  ),
};

// Exclusive group — radios sharing a `name` give native single-select.
export const ExclusiveGroup: Story = {
  render: (args) => (
    <div style="display: flex; flex-wrap: wrap; gap: 8px">
      {["Left", "Center", "Right", "Justify"].map((opt, i) => (
        <label class:x-toggle data-variant={args.variant} data-size={args.size}>
          <input
            type="radio"
            name="align"
            class:unset
            checked={i === 1 || undefined}
          />
          {opt}
        </label>
      ))}
    </div>
  ),
};

// Icon-only — `data-icon` makes a square toggle. B / I / U formatting marks.
export const Icon: Story = {
  render: (args) => (
    <div style="display: flex; flex-wrap: wrap; gap: 8px">
      <label
        class:x-toggle
        data-icon
        data-variant={args.variant}
        data-size={args.size}
        style="font-weight: bold"
      >
        <input type="checkbox" class:unset aria-label="Bold" />
        <StoryIcon name="format_bold" />
      </label>
      <label
        class:x-toggle
        data-icon
        data-variant={args.variant}
        data-size={args.size}
        style="font-style: italic"
      >
        <input type="checkbox" class:unset checked aria-label="Italic" />
        <StoryIcon name="format_italic" />
      </label>
      <label
        class:x-toggle
        data-icon
        data-variant={args.variant}
        data-size={args.size}
        style="text-decoration: underline"
      >
        <input type="checkbox" class:unset aria-label="Underline" />
        <StoryIcon name="format_underlined" />
      </label>
    </div>
  ),
};

/** data-layout="stacked": icon above the label, the stacked button's geometry. */
export const Stacked: Story = {
  render: (args) => (
    <div style="display: flex; flex-wrap: wrap; gap: 8px">
      <label
        class:x-toggle
        data-layout="stacked"
        data-variant={args.variant}
        data-size={args.size}
      >
        <input type="checkbox" class:unset checked />
        <StoryIcon name="flag" />
        <span>Flag</span>
      </label>
      <label
        class:x-toggle
        data-layout="stacked"
        data-variant={args.variant}
        data-size={args.size}
      >
        <input type="checkbox" class:unset />
        <StoryIcon name="notifications_off" />
        <span>Mute</span>
      </label>
    </div>
  ),
};

/** Navigation rail: data-layout="stacked-icon" radio toggles, the selection on a highlight around the icon. */
export const NavigationRail: Story = {
  args: { variant: "borderless" },
  render: (args) => (
    <div style="display: flex; height: 360px; box-shadow: 0 0 0 1px var(--neutral-a5); border-radius: var(--radius-4); overflow: hidden">
      <nav
        aria-label="Sections"
        style="display: flex; flex: none; flex-direction: column; max-width: 96px; gap: 16px; box-sizing: border-box; padding: 16px 8px; box-shadow: inset -1px 0 var(--neutral-a5)"
      >
        {(
          [
            ["Home", "home"],
            ["Search", "search"],
            ["Photos", "local_library"],
            ["Profile", "person"],
          ] as const
        ).map(([label, name], i) => (
          <label
            class:x-toggle
            data-layout="stacked-icon"
            data-variant={args.variant}
            data-size={args.size}
          >
            <input
              type="radio"
              name="rail"
              class:unset
              checked={i === 0 || undefined}
            />
            <StoryIcon name={name} />
            <span>{label}</span>
          </label>
        ))}
      </nav>
      <main style="flex: 1; padding: 16px; color: var(--neutral-a11)">
        Content
      </main>
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div style="display: flex; flex-wrap: wrap; gap: 8px">
      <label class:x-toggle data-variant={args.variant} data-size={args.size}>
        <input type="checkbox" class:unset disabled />
        Disabled
      </label>
      <label class:x-toggle data-variant={args.variant} data-size={args.size}>
        <input type="checkbox" class:unset checked disabled />
        On + Disabled
      </label>
    </div>
  ),
};

const SIZES = ["1", "2", "3"] as const;
const VARIANTS = ["surface", "soft", "borderless"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

// Full grid — every variant x size, an explicit accent row, and disabled /
// checked states.
export const Gallery: Story = {
  render: () => (
    <div style="display: grid; gap: 32px">
      <section>
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
          Sizes
        </h3>
        <div style="display: grid; gap: 12px">
          {SIZES.map((size) => (
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
              <label class:x-toggle data-size={size}>
                <input type="checkbox" class:unset />
                Size {size}
              </label>
              <label class:x-toggle data-size={size}>
                <input type="checkbox" class:unset checked />
                Size {size}
              </label>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
          Variants
        </h3>
        <div style="display: grid; gap: 16px">
          {VARIANTS.map((variant) => (
            <div>
              <code style="font-size: 12px; display: block; margin-bottom: 8px; opacity: 0.7">
                data-variant="{variant}"
              </code>
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
                <label class:x-toggle data-variant={variant}>
                  <input type="checkbox" class:unset />
                  Off
                </label>
                <label class:x-toggle data-variant={variant}>
                  <input type="checkbox" class:unset checked />
                  On
                </label>
                <label class:x-toggle data-variant={variant}>
                  <input type="checkbox" class:unset disabled />
                  Disabled
                </label>
                <label class:x-toggle data-variant={variant}>
                  <input type="checkbox" class:unset checked disabled />
                  On + Disabled
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
          Accent colors
        </h3>
        <div style="display: grid; gap: 12px">
          {ACCENTS.map((accent) => (
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
              {VARIANTS.map((variant) => (
                <label
                  class:x-toggle
                  data-variant={variant}
                  data-accent={accent}
                >
                  <input type="checkbox" class:unset checked />
                  {accent} · {variant}
                </label>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};
