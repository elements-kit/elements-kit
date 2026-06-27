import type { Meta, StoryObj } from "@storybook/html-vite";

import "./checkbox.css";
import "../card/card.css";

interface Args {
  variant: "surface" | "soft";
  size: "1" | "2" | "3";
  label: string;
  checked: boolean;
  indeterminate: boolean;
  highContrast: boolean;
  disabled: boolean;
}

const SIZES = ["1", "2", "3"] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "iris", "crimson", "amber"] as const;

const meta = {
  title: "UI/Checkbox",
  argTypes: {
    variant: { control: "select", options: ["surface", "soft"] },
    size: { control: "select", options: ["1", "2", "3"] },
    label: { control: "text" },
    checked: { control: "boolean" },
    indeterminate: { control: "boolean" },
    highContrast: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    variant: "surface",
    size: "2",
    label: "Accept terms",
    checked: true,
    indeterminate: false,
    highContrast: false,
    disabled: false,
  },
  render: (args) =>
    (
      <label
        style="display: inline-flex; align-items: center; gap: 0.5em; width: fit-content"
      >
        <input
          type="checkbox"
          class:unset
          class:x-checkbox
          data-variant={args.variant}
          data-size={args.size}
          data-high-contrast={args.highContrast ? "" : undefined}
          checked={args.checked}
          disabled={args.disabled}
          ref={(el: HTMLInputElement) => {
            el.indeterminate = args.indeterminate;
          }}
        />
        <span>{args.label}</span>
      </label>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = {};
export const Soft: Story = { args: { variant: "soft" } };

export const Indeterminate: Story = {
  args: { indeterminate: true, checked: false, label: "Select all" },
};

export const WithLabel: Story = {
  render: () =>
    (
      <div style="display: flex; flex-direction: column; gap: var(--space-1)">
        <label style="display: inline-flex; align-items: center; gap: 0.5em; width: fit-content">
          <input type="checkbox" class:unset class:x-checkbox />
          <span>Subscribe to product updates</span>
        </label>
        <label style="display: inline-flex; align-items: center; gap: 0.5em; width: fit-content">
          <input type="checkbox" class:unset class:x-checkbox checked />
          <span>Weekly digest</span>
        </label>
        <label style="display: inline-flex; align-items: center; gap: 0.5em; width: fit-content">
          <input type="checkbox" class:unset class:x-checkbox />
          <span>Security alerts</span>
        </label>
      </div>
    ) as Node,
};

export const Card: Story = {
  render: () =>
    (
      <div style="display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))">
        {(
          [
            ["Hobby", "Free forever. Personal projects only.", true],
            ["Pro", "Unlimited projects, priority support.", false],
            ["Enterprise", "SSO, audit logs, dedicated SLA.", false],
          ] as const
        ).map(([title, body, on]) => (
          <label
            class:unset
            class:x-card
            data-size="2"
            style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer"
          >
            <input
              type="checkbox"
              class:unset
              class:x-checkbox
              style="margin-top: 2px"
              checked={on}
            />
            <div>
              <div style="font-weight: 600; margin-bottom: 2px">{title}</div>
              <div style="color: var(--neutral-11); font-size: 13px">{body}</div>
            </div>
          </label>
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
            Sizes
          </h3>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem">
            {SIZES.map((size) => (
              <label style="display: inline-flex; align-items: center; gap: 0.5em">
                <input
                  type="checkbox"
                  class:unset
                  class:x-checkbox
                  data-size={size}
                  checked
                />
                <span>Size {size}</span>
              </label>
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
                <code style="font-size: 12px; color: var(--neutral-11); display: block; margin-bottom: 8px">
                  data-variant="{variant}"
                </code>
                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem">
                  <label style="display: inline-flex; align-items: center; gap: 0.5em">
                    <input
                      type="checkbox"
                      class:unset
                      class:x-checkbox
                      data-variant={variant}
                    />
                    <span>Unchecked</span>
                  </label>
                  <label style="display: inline-flex; align-items: center; gap: 0.5em">
                    <input
                      type="checkbox"
                      class:unset
                      class:x-checkbox
                      data-variant={variant}
                      checked
                    />
                    <span>Checked</span>
                  </label>
                  <label style="display: inline-flex; align-items: center; gap: 0.5em">
                    <input
                      type="checkbox"
                      class:unset
                      class:x-checkbox
                      data-variant={variant}
                      ref={(el: HTMLInputElement) => {
                        el.indeterminate = true;
                      }}
                    />
                    <span>Indeterminate</span>
                  </label>
                  <label style="display: inline-flex; align-items: center; gap: 0.5em; color: var(--neutral-a8)">
                    <input
                      type="checkbox"
                      class:unset
                      class:x-checkbox
                      data-variant={variant}
                      checked
                      disabled
                    />
                    <span>Disabled</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            High contrast
          </h3>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem">
            {VARIANTS.map((variant) => (
              <label style="display: inline-flex; align-items: center; gap: 0.5em">
                <input
                  type="checkbox"
                  class:unset
                  class:x-checkbox
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
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Accent colors
          </h3>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem">
            {ACCENTS.map((color) => (
              <label style="display: inline-flex; align-items: center; gap: 0.5em">
                <input
                  type="checkbox"
                  class:unset
                  class:x-checkbox
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
