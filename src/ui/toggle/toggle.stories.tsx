import type { Meta, StoryObj } from "@storybook/html-vite";

import "./toggle.css";

interface Args {
  label: string;
  variant: "surface" | "soft";
  size: "1" | "2" | "3";
  checked: boolean;
  disabled: boolean;
}

const meta = {
  title: "UI/Toggle",
  argTypes: {
    label: { control: "text" },
    variant: { control: "select", options: ["surface", "soft"] },
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
  render: (args) =>
    (
      <label class:x-toggle data-variant={args.variant} data-size={args.size}>
        <input
          type="checkbox"
          class:unset
          checked={args.checked || undefined}
          disabled={args.disabled || undefined}
        />
        {args.label}
      </label>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = { args: { variant: "surface", checked: true } };
export const Soft: Story = { args: { variant: "soft", checked: true } };

// Binary toggle — a single checkbox. Pressed state is driven by
// :has(input:checked); no JavaScript.
export const Binary: Story = {
  render: (args) =>
    (
      <label class:x-toggle data-variant={args.variant} data-size={args.size}>
        <input type="checkbox" class:unset checked />
        Bold
      </label>
    ) as Node,
};

// Exclusive group — radios sharing a `name` give native single-select.
export const ExclusiveGroup: Story = {
  render: (args) =>
    (
      <div style="display: flex; flex-wrap: wrap; gap: 8px">
        {["Left", "Center", "Right", "Justify"].map((opt, i) => (
          <label
            class:x-toggle
            data-variant={args.variant}
            data-size={args.size}
          >
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
    ) as Node,
};

// Icon-only — `data-icon` makes a square toggle. B / I / U formatting marks.
export const Icon: Story = {
  render: (args) =>
    (
      <div style="display: flex; flex-wrap: wrap; gap: 8px">
        <label
          class:x-toggle
          data-icon
          data-variant={args.variant}
          data-size={args.size}
          style="font-weight: bold"
        >
          <input type="checkbox" class:unset />B
        </label>
        <label
          class:x-toggle
          data-icon
          data-variant={args.variant}
          data-size={args.size}
          style="font-style: italic"
        >
          <input type="checkbox" class:unset checked />I
        </label>
        <label
          class:x-toggle
          data-icon
          data-variant={args.variant}
          data-size={args.size}
          style="text-decoration: underline"
        >
          <input type="checkbox" class:unset />U
        </label>
      </div>
    ) as Node,
};

export const Disabled: Story = {
  render: (args) =>
    (
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
    ) as Node,
};

const SIZES = ["1", "2", "3"] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

// Full grid — every variant x size, an explicit accent row, and disabled /
// checked states.
export const Gallery: Story = {
  render: () =>
    (
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
    ) as Node,
};
