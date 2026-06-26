import type { Meta, StoryObj } from "@storybook/html-vite";

import "./card.css";

interface Args {
  variant: "surface" | "elevated" | "borderless";
  size: "1" | "2" | "3" | "4" | "5";
  interactive: boolean;
}

const meta = {
  title: "UI/Card",
  argTypes: {
    variant: {
      control: "select",
      options: ["surface", "elevated", "borderless"],
    },
    size: { control: "select", options: ["1", "2", "3", "4", "5"] },
    interactive: {
      control: "boolean",
      description: "Render as &lt;button&gt; to enable hover/active states",
    },
  },
  args: { variant: "surface", size: "3", interactive: false },
  render: (args) => {
    const Tag = args.interactive ? "button" : "div";
    return (
      <Tag
        class:unset
        class:x-card
        data-variant={args.variant}
        data-size={args.size}
      >
        <strong>Card title</strong>
        <p style="margin:8px 0 0">
          Body copy showing the card surface, ring, and padding scale.
        </p>
      </Tag>
    ) as Node;
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = {};
export const Elevated: Story = { args: { variant: "elevated" } };
export const Borderless: Story = { args: { variant: "borderless" } };
