import type { Meta, StoryObj } from "@storybook/html-vite";

import "../button/button.css";
import "./separator.css";

interface Args {
  orientation: "horizontal" | "vertical";
  size: "1" | "2" | "3" | "4";
  accent: boolean;
}

const meta = {
  title: "UI/Separator",
  argTypes: {
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    size: { control: "select", options: ["1", "2", "3", "4"] },
    accent: { control: "boolean", description: "data-accent: an accent line" },
  },
  args: { orientation: "horizontal", size: "4", accent: false },
  render: (args) =>
    args.orientation === "vertical" ? (
      <div style="display: flex; align-items: center; gap: 12px; block-size: 32px">
        <button class:unset class:x-button data-variant="borderless">Cut</button>
        <hr class:x-separator aria-orientation="vertical" data-size={args.size} data-accent={args.accent ? "" : undefined} />
        <button class:unset class:x-button data-variant="borderless">Copy</button>
        <hr class:x-separator aria-orientation="vertical" data-size={args.size} data-accent={args.accent ? "" : undefined} />
        <button class:unset class:x-button data-variant="borderless">Paste</button>
      </div>
    ) : (
      <div style="inline-size: 280px; color: var(--neutral-12)">
        <p style="margin: 0 0 12px">Above the line.</p>
        <hr class:x-separator data-size={args.size} data-accent={args.accent ? "" : undefined} />
        <p style="margin: 12px 0 0">Below the line.</p>
      </div>
    ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Horizontal: Story = {};
export const Vertical: Story = { args: { orientation: "vertical" } };
export const Sizes: Story = {
  render: () => (
    <div style="display: flex; flex-direction: column; gap: 16px; inline-size: 280px">
      <hr class:x-separator data-size="1" />
      <hr class:x-separator data-size="2" />
      <hr class:x-separator data-size="3" />
      <hr class:x-separator data-size="4" />
    </div>
  ),
};
