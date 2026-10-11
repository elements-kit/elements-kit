import type { Meta, StoryObj } from "@storybook/html-vite";

import "./slider.css";

interface Args {
  variant: "surface" | "soft";
  size: "1" | "2" | "3";
  value: number;
  disabled: boolean;
}

const meta = {
  title: "UI/Slider",
  argTypes: {
    variant: { control: "select", options: ["surface", "soft"] },
    size: { control: "select", options: ["1", "2", "3"] },
    value: { control: "number" },
    disabled: { control: "boolean" },
  },
  args: { variant: "surface", size: "2", value: 50, disabled: false },
  render: (args) =>
    (
      <input
        type="range"
        class:x-slider
        data-variant={args.variant}
        data-size={args.size}
        min="0"
        max="100"
        value={String(args.value)}
        disabled={args.disabled || undefined}
      />
    ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = { args: { variant: "surface" } };
export const Soft: Story = { args: { variant: "soft" } };

export const Disabled: Story = { args: { disabled: true, value: 30 } };

const SIZES = ["1", "2", "3"] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

// Full grid — every size, every variant, an explicit accent row, and a
// disabled slider.
export const Gallery: Story = {
  render: () =>
    (
      <div style="display: grid; gap: 24px; max-width: 360px">
        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Sizes
          </h3>
          <div style="display: grid; gap: 20px">
            {SIZES.map((size) => (
              <div>
                <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--neutral-11)">
                  Size {size}
                </label>
                <input
                  type="range"
                  class:x-slider
                  data-size={size}
                  min="0"
                  max="100"
                  value="40"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Variants
          </h3>
          <div style="display: grid; gap: 20px">
            {VARIANTS.map((variant) => (
              <div>
                <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--neutral-11)">
                  data-variant="{variant}"
                </label>
                <input
                  type="range"
                  class:x-slider
                  data-variant={variant}
                  min="0"
                  max="100"
                  value="60"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Accent colors
          </h3>
          <div style="display: grid; gap: 20px">
            {ACCENTS.map((accent) => (
              <div>
                <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--neutral-11)">
                  {accent}
                </label>
                <input
                  type="range"
                  class:x-slider
                  data-accent={accent}
                  min="0"
                  max="100"
                  value="50"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Disabled
          </h3>
          <input
            type="range"
            class:x-slider
            min="0"
            max="100"
            value="30"
            disabled
          />
        </section>
      </div>
    ),
};
