import type { Meta, StoryObj } from "@storybook/html-vite";

import "./progress.css";

interface Args {
  variant: "surface" | "soft";
  size: "1" | "2" | "3";
  value: number;
}

const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

const meta = {
  title: "UI/Progress",
  argTypes: {
    variant: {
      control: "select",
      options: ["surface", "soft"],
    },
    size: { control: "select", options: ["1", "2", "3"] },
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
  },
  args: {
    variant: "surface",
    size: "2",
    value: 50,
  },
  render: (args) =>
    (
      <progress
        class:x-progress
        data-variant={args.variant}
        data-size={args.size}
        value={String(args.value)}
        max="100"
      />
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = { args: { variant: "surface" } };
export const Soft: Story = { args: { variant: "soft" } };

export const Quarter: Story = { args: { value: 25 } };
export const Half: Story = { args: { value: 50 } };
export const Complete: Story = { args: { value: 100 } };

// Omitting `value` puts the native element into its indeterminate state.
export const Indeterminate: Story = {
  render: (args) =>
    (
      <progress
        class:x-progress
        data-variant={args.variant}
        data-size={args.size}
      />
    ) as Node,
};

export const Gallery: Story = {
  render: () => {
    const VARIANTS = ["surface", "soft"] as const;
    const SIZES = ["1", "2", "3"] as const;
    const VALUES = [25, 50, 75, 100] as const;
    return (
      <div style="display: grid; gap: 24px; max-width: 480px">
        <div>
          <h3 style="margin: 0 0 12px">Variants × Sizes</h3>
          <div style="display: grid; gap: 16px">
            {VARIANTS.flatMap((variant) =>
              SIZES.map((size) => (
                <div>
                  <code style="font-size: 12px; color: var(--neutral-11); display: block; margin-bottom: 6px">
                    {variant} · size {size}
                  </code>
                  <progress
                    class:x-progress
                    data-variant={variant}
                    data-size={size}
                    value="65"
                    max="100"
                  />
                </div>
              )),
            )}
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 12px">Value states</h3>
          <div style="display: grid; gap: 12px">
            {VALUES.map((value) => (
              <div>
                <code style="font-size: 12px; color: var(--neutral-11); display: block; margin-bottom: 6px">
                  value={value}
                </code>
                <progress class:x-progress value={String(value)} max="100" />
              </div>
            ))}
            <div>
              <code style="font-size: 12px; color: var(--neutral-11); display: block; margin-bottom: 6px">
                indeterminate
              </code>
              <progress class:x-progress />
            </div>
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 12px">Accents</h3>
          <div style="display: grid; gap: 12px">
            {ACCENTS.map((accent) => (
              <div data-accent={accent}>
                <code style="font-size: 12px; color: var(--neutral-11); display: block; margin-bottom: 6px">
                  {accent}
                </code>
                <progress class:x-progress value="70" max="100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    ) as Node;
  },
};
