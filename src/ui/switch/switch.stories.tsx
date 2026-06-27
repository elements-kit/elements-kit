import type { Meta, StoryObj } from "@storybook/html-vite";

import "./switch.css";

interface Args {
  variant: "surface" | "soft";
  size: "1" | "2" | "3";
  label: string;
  checked: boolean;
  highContrast: boolean;
  disabled: boolean;
}

const SIZES = ["1", "2", "3"] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "iris", "crimson", "amber"] as const;

const meta = {
  title: "UI/Switch",
  argTypes: {
    variant: { control: "select", options: ["surface", "soft"] },
    size: { control: "select", options: ["1", "2", "3"] },
    label: { control: "text" },
    checked: { control: "boolean" },
    highContrast: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    variant: "surface",
    size: "2",
    label: "Enabled",
    checked: true,
    highContrast: false,
    disabled: false,
  },
  render: (args) =>
    (
      <label style="display: inline-flex; align-items: center; gap: 0.5em; width: fit-content">
        <input
          type="checkbox"
          role="switch"
          class:unset
          class:x-switch
          data-variant={args.variant}
          data-size={args.size}
          data-high-contrast={args.highContrast ? "" : undefined}
          checked={args.checked}
          disabled={args.disabled}
        />
        <span>{args.label}</span>
      </label>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = {};
export const Soft: Story = { args: { variant: "soft" } };

export const On: Story = { args: { checked: true, label: "On" } };
export const Off: Story = { args: { checked: false, label: "Off" } };

export const SettingsList: Story = {
  render: () =>
    (
      <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px">
        {(
          [
            ["Email notifications", true],
            ["Push notifications", false],
            ["Weekly digest", true],
            ["Beta features", false],
          ] as const
        ).map(([label, on]) => (
          <label style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 8px 0; border-bottom: 1px solid var(--neutral-a4)">
            <span>{label}</span>
            <input
              type="checkbox"
              role="switch"
              class:unset
              class:x-switch
              checked={on}
            />
          </label>
        ))}
      </div>
    ) as Node,
};

export const Gallery: Story = {
  render: () =>
    (
      <div style="display: grid; gap: 24px; color: var(--neutral-12)">
        <section>
          <h3 style="margin: 0 0 12px">Sizes</h3>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem">
            {SIZES.map((size) => (
              <label style="display: inline-flex; align-items: center; gap: 0.5em">
                <input
                  type="checkbox"
                  role="switch"
                  class:unset
                  class:x-switch
                  data-size={size}
                  checked
                />
                <span>Size {size}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px">Variants</h3>
          <div style="display: grid; gap: 16px">
            {VARIANTS.map((variant) => (
              <div>
                <code style="font-size: 12px; color: var(--neutral-11); display: block; margin-bottom: 8px">
                  data-variant="{variant}"
                </code>
                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem">
                  <label style="display: inline-flex; align-items: center; gap: 0.5em">
                    <input
                      type="checkbox"
                      role="switch"
                      class:unset
                      class:x-switch
                      data-variant={variant}
                    />
                    <span>Off</span>
                  </label>
                  <label style="display: inline-flex; align-items: center; gap: 0.5em">
                    <input
                      type="checkbox"
                      role="switch"
                      class:unset
                      class:x-switch
                      data-variant={variant}
                      checked
                    />
                    <span>On</span>
                  </label>
                  <label style="display: inline-flex; align-items: center; gap: 0.5em; color: var(--neutral-a8)">
                    <input
                      type="checkbox"
                      role="switch"
                      class:unset
                      class:x-switch
                      data-variant={variant}
                      disabled
                    />
                    <span>Disabled off</span>
                  </label>
                  <label style="display: inline-flex; align-items: center; gap: 0.5em; color: var(--neutral-a8)">
                    <input
                      type="checkbox"
                      role="switch"
                      class:unset
                      class:x-switch
                      data-variant={variant}
                      checked
                      disabled
                    />
                    <span>Disabled on</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px">High contrast</h3>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem">
            {VARIANTS.map((variant) => (
              <label style="display: inline-flex; align-items: center; gap: 0.5em">
                <input
                  type="checkbox"
                  role="switch"
                  class:unset
                  class:x-switch
                  data-variant={variant}
                  data-high-contrast=""
                  checked
                />
                <span>{variant}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px">Accent colors</h3>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem">
            {ACCENTS.map((color) => (
              <label style="display: inline-flex; align-items: center; gap: 0.5em">
                <input
                  type="checkbox"
                  role="switch"
                  class:unset
                  class:x-switch
                  data-accent={color}
                  checked
                />
                <span>{color}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
    ) as Node,
};
