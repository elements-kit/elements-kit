import type { Meta, StoryObj } from "@storybook/html-vite";

import "./alert.css";
import "../button/button.css";

interface Args {
  variant: "soft" | "surface" | "outline";
  size: "1" | "2" | "3";
  title: string;
  description: string;
}

const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

const InfoIcon = () =>
  (
    <svg
      class:x-alert-icon
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      style="fill: currentColor"
    >
      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 3a1 1 0 110 2 1 1 0 010-2zm1 10H7V7h2v6z" />
    </svg>
  );

const meta = {
  title: "UI/Alert",
  argTypes: {
    variant: {
      control: "select",
      options: ["soft", "surface", "outline"],
    },
    size: { control: "select", options: ["1", "2", "3"] },
    title: { control: "text" },
    description: { control: "text" },
  },
  args: {
    variant: "soft",
    size: "2",
    title: "Heads up",
    description: "Your trial ends in 7 days.",
  },
  render: (args) =>
    (
      <div
        class:unset
        class:x-alert
        data-variant={args.variant}
        data-size={args.size}
      >
        {InfoIcon()}
        <div>
          <strong>{args.title}</strong> — {args.description}
        </div>
      </div>
    ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Soft: Story = { args: { variant: "soft" } };
export const Surface: Story = { args: { variant: "surface" } };
export const Outline: Story = { args: { variant: "outline" } };

// Color semantics come from `data-accent`, not the variant.
export const Info: Story = {
  args: {
    title: "Info",
    description: "A new version is available.",
  },
  render: (args) =>
    (
      <div
        class:unset
        class:x-alert
        data-variant={args.variant}
        data-size={args.size}
        data-accent="blue"
      >
        {InfoIcon()}
        <div>
          <strong>{args.title}</strong> — {args.description}
        </div>
      </div>
    ),
};

export const Success: Story = {
  args: {
    title: "Success",
    description: "Your changes have been saved.",
  },
  render: (args) =>
    (
      <div
        class:unset
        class:x-alert
        data-variant={args.variant}
        data-size={args.size}
        data-accent="mint"
      >
        {InfoIcon()}
        <div>
          <strong>{args.title}</strong> — {args.description}
        </div>
      </div>
    ),
};

export const Warning: Story = {
  args: {
    title: "Warning",
    description: "Your trial ends in 7 days.",
  },
  render: (args) =>
    (
      <div
        class:unset
        class:x-alert
        data-variant={args.variant}
        data-size={args.size}
        data-accent="amber"
      >
        {InfoIcon()}
        <div>
          <strong>{args.title}</strong> — {args.description}
        </div>
      </div>
    ),
};

export const Error: Story = {
  args: {
    title: "Error",
    description: "We couldn't process your payment.",
  },
  render: (args) =>
    (
      <div
        class:unset
        class:x-alert
        data-variant={args.variant}
        data-size={args.size}
        data-accent="crimson"
      >
        {InfoIcon()}
        <div>
          <strong>{args.title}</strong> — {args.description}
        </div>
      </div>
    ),
};

// `--accent-12` text bump for higher contrast.
export const HighContrast: Story = {
  args: {
    title: "High contrast",
    description: "Soft variant with the text color bumped to --accent-12.",
  },
  render: (args) =>
    (
      <div
        class:unset
        class:x-alert
        data-variant={args.variant}
        data-size={args.size}
        data-accent="amber"
        data-high-contrast
      >
        {InfoIcon()}
        <div>
          <strong>{args.title}</strong> — {args.description}
        </div>
      </div>
    ),
};

// Composition: an action button laid out alongside the message body.
export const WithAction: Story = {
  args: {
    title: "Update available",
    description: "Restart to apply the latest version.",
  },
  render: (args) =>
    (
      <div
        class:unset
        class:x-alert
        data-variant={args.variant}
        data-size={args.size}
        data-accent="blue"
      >
        {InfoIcon()}
        <div
          style="display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%"
        >
          <div>
            <strong>{args.title}</strong> — {args.description}
          </div>
          <button
            class:unset
            class:x-button
            data-variant="soft"
            data-size="1"
            data-accent="blue"
          >
            Restart
          </button>
        </div>
      </div>
    ),
};

export const Gallery: Story = {
  render: (args) => {
    const VARIANTS = ["soft", "surface", "outline"] as const;
    const SIZES = ["1", "2", "3"] as const;
    return (
      <div style="display: grid; gap: 24px">
        <div>
          <h3 style="margin: 0 0 12px">Variants × Sizes</h3>
          <div style="display: grid; gap: 12px">
            {VARIANTS.flatMap((variant) =>
              SIZES.map((size) => (
                <div
                  class:unset
                  class:x-alert
                  data-variant={variant}
                  data-size={size}
                  data-accent="blue"
                >
                  {InfoIcon()}
                  <div>
                    <strong>{variant}</strong> · size {size} — {args.description}
                  </div>
                </div>
              )),
            )}
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 12px">Accents</h3>
          <div style="display: grid; gap: 12px">
            {ACCENTS.map((accent) => (
              <div
                class:unset
                class:x-alert
                data-variant={args.variant}
                data-size={args.size}
                data-accent={accent}
              >
                {InfoIcon()}
                <div>
                  <strong>{accent}</strong> — {args.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
};
