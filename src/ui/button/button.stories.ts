import type { Meta, StoryObj } from "@storybook/html-vite";

import "./button.css";

interface Args {
  label: string;
  variant: "solid" | "soft" | "surface" | "outline" | "text" | "borderless";
  size: "1" | "2" | "3" | "4";
  highContrast: boolean;
  disabled: boolean;
}

const meta = {
  title: "UI/Button",
  argTypes: {
    label: { control: "text" },
    variant: {
      control: "select",
      options: ["solid", "soft", "surface", "outline", "text", "borderless"],
    },
    size: { control: "select", options: ["1", "2", "3", "4"] },
    highContrast: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Button",
    variant: "solid",
    size: "2",
    highContrast: false,
    disabled: false,
  },
  render: (args) => {
    const button = document.createElement("button");
    button.className = "unset x-button";
    button.dataset.variant = args.variant;
    button.dataset.size = args.size;
    if (args.highContrast) button.dataset.highContrast = "";
    button.disabled = args.disabled;
    button.textContent = args.label;
    return button;
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Solid: Story = {};
export const Soft: Story = { args: { variant: "soft" } };
export const Surface: Story = { args: { variant: "surface" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Text: Story = { args: { variant: "text" } };

// Icon-only — `data-icon` makes a square button sized by height. Needs an
// aria-label since there's no text for screen readers.
export const Icon: Story = {
  args: { variant: "soft" },
  render: (args) => {
    const button = document.createElement("button");
    button.className = "unset x-button";
    button.dataset.variant = args.variant;
    button.dataset.size = args.size;
    button.dataset.icon = "";
    button.setAttribute("aria-label", "Close");
    if (args.highContrast) button.dataset.highContrast = "";
    button.disabled = args.disabled;
    button.innerHTML =
      '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">' +
      '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" fill="none" />' +
      "</svg>";
    return button;
  },
};

// `.x-button` is class-only — apply it to an <a> for a link styled as a button.
export const AsLink: Story = {
  render: (args) => {
    const link = document.createElement("a");
    link.className = "unset x-button";
    link.dataset.variant = args.variant;
    link.dataset.size = args.size;
    if (args.highContrast) link.dataset.highContrast = "";
    link.href = "#";
    link.textContent = args.label;
    return link;
  },
};
