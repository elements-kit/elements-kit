import { StoryIcon } from "../../../storybook/icon";
import type { Meta, StoryObj } from "@storybook/html-vite";

import "../styles/palette/red.css";
import "../styles/accent/red.css";
import "../card/card.css";
import "../label/label.css";
import "../separator/separator.css";
import "./menu.css";

interface Args {
  size: "1" | "2";
  highlight: "solid" | "soft";
  highContrast: boolean;
}

const meta = {
  title: "UI/Menu",
  argTypes: {
    size: { control: "select", options: ["1", "2"] },
    highlight: { control: "select", options: ["solid", "soft"] },
    highContrast: { control: "boolean" },
  },
  args: { size: "2", highlight: "solid", highContrast: false },
  render: (args) => (
    <div
      class:x-card
      class:x-menu
      role="menu"
      aria-label="Actions"
      data-variant="elevated"
      data-size={args.size}
      data-highlight={args.highlight}
      data-high-contrast={args.highContrast || undefined}
      style="inline-size: 220px"
    >
      <div class:x-label data-variant="group">Message</div>
      <button class:unset class:x-menu-item role="menuitem">
        <StoryIcon name="edit" />
        <span>Edit</span>
        <span class:x-menu-trailing>⌘E</span>
      </button>
      <button class:unset class:x-menu-item role="menuitem">
        <StoryIcon name="reply" />
        <span>Reply</span>
        <span class:x-menu-trailing>⌘R</span>
      </button>
      <button class:unset class:x-menu-item role="menuitem">
        <StoryIcon name="forward" />
        <span>Forward</span>
      </button>
      <hr class:x-separator />
      <button class:unset class:x-menu-item role="menuitem" disabled>
        <StoryIcon name="flag" />
        <span>Flag</span>
      </button>
      <button class:unset class:x-menu-item role="menuitem" data-accent="red">
        <StoryIcon name="delete" />
        <span>Delete</span>
        <span class:x-menu-trailing>⌫</span>
      </button>
    </div>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Solid: Story = {};
export const Soft: Story = { args: { highlight: "soft" } };
export const Small: Story = { args: { size: "1" } };
