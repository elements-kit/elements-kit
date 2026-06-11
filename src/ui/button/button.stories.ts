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
