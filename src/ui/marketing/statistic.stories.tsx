import type { Meta, StoryObj } from "@storybook/html-vite";

import "./marketing.css";

interface Args {
  size: "1" | "2" | "3";
  align: "start" | "center";
}

const meta = {
  title: "Marketing/Statistic",
  argTypes: {
    size: { control: "select", options: ["1", "2", "3"] },
    align: { control: "inline-radio", options: ["start", "center"] },
  },
  args: { size: "2", align: "start" },
  render: (args) =>
    (
      <div
        class:statistic
        data-size={args.size === "2" ? undefined : args.size}
        data-align={args.align === "center" ? "center" : undefined}
      >
        <p data-leading>Up to</p>
        <p data-heading>75%</p>
        <p data-description>faster builds across the engineering org.</p>
      </div>
    ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const Small: Story = { args: { size: "1" } };

export const Large: Story = { args: { size: "3" } };

export const Center: Story = {
  args: { align: "center" },
  render: (args) =>
    (
      <div class:statistic data-align="center">
        <p data-leading>Up to</p>
        <p data-heading>99.99%</p>
        <p data-description>uptime across managed deployments.</p>
      </div>
    ),
};

// Statistics tile into a row of equal columns.
export const Row: Story = {
  render: () =>
    (
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px">
        <div class:statistic>
          <p data-leading>Used by</p>
          <p data-heading>120+</p>
          <p data-description>teams shipping to production.</p>
        </div>
        <div class:statistic>
          <p data-leading>Average</p>
          <p data-heading>3.2×</p>
          <p data-description>faster page assembly.</p>
        </div>
        <div class:statistic>
          <p data-leading>Since</p>
          <p data-heading>2024</p>
          <p data-description>with monthly releases.</p>
        </div>
      </div>
    ),
};
