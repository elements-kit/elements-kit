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
  render: (args) => (
    <header class:section-header data-align={args.align}>
      <h3 class:section-heading class:section-heading-2>
        A start-aligned header
      </h3>
      <p class:section-paragraph>
        Heading + lede paragraph. The typical pattern above a row of rivers.
        Default copy color is <em>--neutral-11</em>; emphasized inline runs are{" "}
        <em>--neutral-12</em> for stronger contrast.
      </p>
      <a
        class:unset
        class:x-button
        data-size="3"
        data-variant="surface"
        href="#"
      >
        Optional CTA
      </a>
    </header>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
export const LeftAligned: Story = { args: { align: "start" } };
export const Centered: Story = { args: { align: "center" } };

// `.section-heading` ships four sizes — pair it with a `.section-heading-N`.
export const HeadingSizes: Story = {
  render: () => (
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
  ),
};

// `.page-section` gives the themed background + vertical padding;
// `.page-container` caps width and gutters the content.
export const PageSection: Story = {
  render: () => (
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
  ),
};

// `--page-gutter-*` lines an element up with `.page-container` content without
// putting it inside the container. Here the scroller is a sibling of the
// container, so it spans the full width and its overflow runs off the edge of
// the screen — while its first chip still sits under the heading. Narrow the
// preview to see the row scroll.
export const PageGutter: Story = {
  // `layout: "fullscreen"` matters: the gutter is measured off `100cqi`, so the
  // section has to span the viewport the way it does on a real page. Storybook's
  // default padded layout insets it and the row lands 1rem off the heading.
  parameters: { layout: "fullscreen" },
  render: () => (
    <section class:page-section>
      <div class:page-container>
        <h3 class:section-heading class:section-heading-3>
          Aligned with the first chip
        </h3>
      </div>
      <div style="display: flex; gap: 0.5rem; overflow-x: auto; margin-top: 1rem; padding-block: 0.5rem; padding-inline: var(--page-gutter-left);">
        {Array.from({ length: 14 }, (_, i) => (
          <a
            class:unset
            class:x-button
            data-size="2"
            data-variant="surface"
            style="flex: none"
            href="#"
          >
            Chip {i + 1}
          </a>
        ))}
      </div>
      <div class:page-container>
        <p class:section-paragraph style="margin-top: 1rem">
          Inside .page-container the row would stop at the max-width cap.
          Outside it, padded by the gutter, it starts on the same line and keeps
          scrolling past the edge.
        </p>
      </div>
    </section>
  ),
};
