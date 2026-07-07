import type { Meta, StoryObj } from "@storybook/html-vite";

import "./text-input.css";
import "../kbd/kbd.css";

interface Args {
  variant: "surface" | "soft";
  size: "1" | "2" | "3";
  placeholder: string;
  disabled: boolean;
}

const SIZES = ["1", "2", "3"] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;
const TYPES = ["text", "email", "password", "date", "number"] as const;

const meta = {
  title: "UI/Text Input",
  argTypes: {
    variant: { control: "select", options: ["surface", "soft"] },
    size: { control: "select", options: ["1", "2", "3"] },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
  },
  args: {
    variant: "surface",
    size: "2",
    placeholder: "Type something…",
    disabled: false,
  },
  render: (args) =>
    (
      <input
        class:unset
        class:x-text-input
        data-variant={args.variant}
        data-size={args.size}
        placeholder={args.placeholder}
        disabled={args.disabled}
      />
    ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = {};
export const Soft: Story = { args: { variant: "soft" } };

// Wrapper — a bare `<div class="x-text-input">` becomes a horizontal affix
// container with start/end affixes (any non-input/textarea child) flanking the
// bare <input>. Here: a leading search icon and a trailing kbd shortcut chip.
export const Wrapper: Story = {
  render: (args) =>
    (
      <div
        class:x-text-input
        data-variant={args.variant}
        data-size={args.size}
      >
        <span aria-hidden="true">🔍</span>
        <input class:unset placeholder={args.placeholder} disabled={args.disabled} />
        <kbd
          class:unset
          class:x-kbd
          data-size={args.size}
          style="margin-block: auto; margin-inline: 4px"
        >
          ⌘K
        </kbd>
      </div>
    ),
};

// Textarea wrapper — vertical container with top/bottom affixes around a bare
// <textarea>.
export const Textarea: Story = {
  render: (args) =>
    (
      <div
        class:x-text-input
        data-variant={args.variant}
        data-size={args.size}
      >
        <div style="padding: 6px 10px; font-size: 12px; color: var(--neutral-a11); border-bottom: 1px solid var(--neutral-a4)">
          Markdown
        </div>
        <textarea
          class:unset
          placeholder={args.placeholder}
          rows={4}
          disabled={args.disabled}
        />
        <div style="padding: 6px 8px; border-top: 1px solid var(--neutral-a4); display: flex; align-items: center; justify-content: space-between; gap: 8px">
          <span style="font-size: 12px; color: var(--neutral-a11)">0 / 280</span>
        </div>
      </div>
    ),
};

// Native input types share the same `.x-text-input` styling.
export const Types: Story = {
  render: (args) =>
    (
      <div style="display: grid; gap: 12px">
        {TYPES.map((type) => (
          <input
            class:unset
            class:x-text-input
            type={type}
            data-variant={args.variant}
            data-size={args.size}
            placeholder={type}
            aria-label={type}
            disabled={args.disabled}
          />
        ))}
      </div>
    ),
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: "Disabled input" },
  render: (args) =>
    (
      <div style="display: grid; gap: 12px">
        <input
          class:unset
          class:x-text-input
          data-variant={args.variant}
          data-size={args.size}
          placeholder="Disabled input"
          disabled
        />
        <div
          class:x-text-input
          data-variant={args.variant}
          data-size={args.size}
        >
          <span aria-hidden="true">🔍</span>
          <input class:unset placeholder="Disabled wrapped input" disabled />
        </div>
        <textarea
          class:unset
          class:x-text-input
          data-variant={args.variant}
          data-size={args.size}
          placeholder="Disabled textarea"
          rows={2}
          disabled
        />
      </div>
    ),
};

export const Gallery: Story = {
  render: () =>
    (
      <div style="display: grid; gap: 28px; color: var(--neutral-12)">
        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Variants × sizes
          </h3>
          <div style="display: grid; gap: 16px">
            {VARIANTS.map((variant) => (
              <div>
                <code style="font-size: 12px; color: var(--neutral-11); display: block; margin-bottom: 8px">
                  data-variant="{variant}"
                </code>
                <div style="display: grid; gap: 12px">
                  {SIZES.map((size) => (
                    <input
                      class:unset
                      class:x-text-input
                      data-variant={variant}
                      data-size={size}
                      placeholder={`Size ${size}`}
                    />
                  ))}
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
            {ACCENTS.map((color) => (
              <input
                class:unset
                class:x-text-input
                data-accent={color}
                data-variant="soft"
                placeholder={color}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600">
            Disabled
          </h3>
          <div style="display: flex; flex-wrap: wrap; gap: 12px">
            {VARIANTS.map((variant) => (
              <input
                class:unset
                class:x-text-input
                data-variant={variant}
                placeholder={variant}
                disabled
              />
            ))}
          </div>
        </section>
      </div>
    ),
};
