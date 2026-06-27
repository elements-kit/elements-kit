import type { Meta, StoryObj } from "@storybook/html-vite";

import "./marketing.css";
import "../button/button.css";

interface Args {
  align: "start" | "center";
}

const meta = {
  title: "Marketing/Hero",
  argTypes: {
    align: { control: "inline-radio", options: ["start", "center"] },
  },
  args: { align: "start" },
  render: (args) =>
    (
      <section class:hero data-align={args.align}>
        <h1 class:section-heading class:section-heading-1>
          Marketing layout
        </h1>
        <p class:section-paragraph>
          Compose pages from hero, sections, rivers, and pillars.
        </p>
        <a
          class:unset
          class:x-button
          data-size="3"
          data-variant="solid"
          href="#"
          style:margin-top="2rem"
        >
          Get started
        </a>
      </section>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
export const LeftAligned: Story = { args: { align: "start" } };
export const Centered: Story = { args: { align: "center" } };
