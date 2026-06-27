import type { Meta, StoryObj } from "@storybook/html-vite";

import "./marketing.css";
import "../button/button.css";

interface Args {
  align: "start" | "center";
}

const meta = {
  title: "Marketing/Section",
  argTypes: {
    align: { control: "inline-radio", options: ["start", "center"] },
  },
  args: { align: "start" },
  render: (args) =>
    (
      <header class:section-header data-align={args.align}>
        <h3 class:section-heading class:section-heading-2>
          A start-aligned header
        </h3>
        <p class:section-paragraph>
          Heading + lede paragraph. The typical pattern above a row of rivers.
          Default copy color is <em>--neutral-11</em>; emphasized inline runs
          are <em>--neutral-12</em> for stronger contrast.
        </p>
        <a class:unset class:x-button data-size="3" data-variant="surface" href="#">
          Optional CTA
        </a>
      </header>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
export const LeftAligned: Story = { args: { align: "start" } };
export const Centered: Story = { args: { align: "center" } };

// `.section-heading` ships four sizes — pair it with a `.section-heading-N`.
export const HeadingSizes: Story = {
  render: () =>
    (
      <div>
        <h2 class:section-heading class:section-heading-1>
          The quick brown fox
        </h2>
        <h2 class:section-heading class:section-heading-2>
          The quick brown fox
        </h2>
        <h2 class:section-heading class:section-heading-3>
          The quick brown fox
        </h2>
        <h2 class:section-heading class:section-heading-4>
          The quick brown fox
        </h2>
      </div>
    ) as Node,
};

// `.page-section` gives the themed background + vertical padding;
// `.page-container` caps width and gutters the content.
export const PageSection: Story = {
  render: () =>
    (
      <section class:page-section>
        <div class:page-container>
          <header class:section-header data-align="center">
            <h3 class:section-heading class:section-heading-2>
              Inside a page-section
            </h3>
            <p class:section-paragraph>
              .page-section gives the themed background + vertical padding.
              .page-container caps width and gutters the content.
            </p>
          </header>
        </div>
      </section>
    ) as Node,
};
