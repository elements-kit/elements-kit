import type { Meta, StoryObj } from "@storybook/html-vite";

import "./select.css";

interface Args {
  variant: "surface" | "soft" | "text";
  size: "1" | "2" | "3";
  disabled: boolean;
}

const SIZES = ["1", "2", "3"] as const;
const VARIANTS = ["surface", "soft", "text"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

const FRUITS = ["Apple", "Orange", "Pear", "Mango", "Kiwi"] as const;

const Options = () =>
  (
    <>
      {FRUITS.map((f) => (
        <option value={f.toLowerCase()}>{f}</option>
      ))}
    </>
  ) as unknown as Node;

const meta = {
  title: "UI/Select",
  argTypes: {
    variant: { control: "select", options: ["surface", "soft", "text"] },
    size: { control: "select", options: ["1", "2", "3"] },
    disabled: { control: "boolean" },
  },
  args: { variant: "surface", size: "2", disabled: false },
  render: (args) =>
    (
      <select
        class:unset
        class:x-select
        data-variant={args.variant}
        data-size={args.size}
        disabled={args.disabled}
      >
        <Options />
      </select>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = {};
export const Soft: Story = { args: { variant: "soft" } };
export const Text: Story = { args: { variant: "text" } };

// A fixed `width` (not min-width) triggers ellipsis truncation on long option
// text in the closed trigger.
export const Truncation: Story = {
  render: (args) =>
    (
      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
        <select
          class:unset
          class:x-select
          data-variant={args.variant}
          data-size={args.size}
          style="width: 16ch"
        >
          <option>A really long option label that overflows</option>
          <option>Short</option>
          <option>Medium length one</option>
        </select>
        <select
          class:unset
          class:x-select
          data-variant="soft"
          data-size={args.size}
          style="width: 16ch"
        >
          <option>Another lengthy option that demonstrates the ellipsis</option>
          <option>Short</option>
        </select>
      </div>
    ) as Node,
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) =>
    (
      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
        {VARIANTS.map((variant) => (
          <select
            class:unset
            class:x-select
            data-variant={variant}
            data-size={args.size}
            disabled
          >
            <Options />
          </select>
        ))}
      </div>
    ) as Node,
};

export const Gallery: Story = {
  render: () =>
    (
      <div style="display: grid; gap: 28px; color: var(--neutral-12)">
        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Variants × sizes
          </h3>
          <div style="display: grid; gap: 12px">
            {SIZES.map((size) => (
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
                {VARIANTS.map((variant) => (
                  <select
                    class:unset
                    class:x-select
                    data-variant={variant}
                    data-size={size}
                  >
                    <Options />
                  </select>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Accent colors
          </h3>
          <div style="display: grid; gap: 12px">
            {ACCENTS.map((color) => (
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
                {VARIANTS.map((variant) => (
                  <select
                    class:unset
                    class:x-select
                    data-variant={variant}
                    data-accent={color}
                  >
                    <option>
                      {color} · {variant}
                    </option>
                    <Options />
                  </select>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Disabled
          </h3>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
            {VARIANTS.map((variant) => (
              <select class:unset class:x-select data-variant={variant} disabled>
                <Options />
              </select>
            ))}
          </div>
        </section>
      </div>
    ) as Node,
};
