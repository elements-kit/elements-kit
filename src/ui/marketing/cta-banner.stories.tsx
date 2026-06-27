import type { Meta, StoryObj } from "@storybook/html-vite";

import "./marketing.css";
import "../card/card.css";
import "../button/button.css";

interface Args {
  align: "center" | "start";
}

const meta = {
  title: "Marketing/CTA Banner",
  argTypes: {
    align: { control: "inline-radio", options: ["center", "start"] },
  },
  args: { align: "center" },
  render: (args) =>
    (
      <div
        class:x-card
        class:cta-banner
        data-align={args.align === "start" ? "start" : undefined}
      >
        <h2 class:section-heading class:section-heading-2>
          Ship faster with composable primitives.
        </h2>
        <p class:section-paragraph>
          Drop the kit into any framework. Class + data-attribute API, no
          runtime, no theming surprises.
        </p>
        <div data-cta>
          <a class:unset class:x-button data-size="3" data-variant="solid" href="#">
            Get in touch
          </a>
          <a
            class:unset
            class:x-button
            data-size="3"
            data-variant="borderless"
            href="#"
          >
            Learn more
          </a>
        </div>
      </div>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const Start: Story = {
  args: { align: "start" },
  render: (args) =>
    (
      <div class:x-card class:cta-banner data-align={args.align}>
        <h2 class:section-heading class:section-heading-2>
          Start-aligned variant
        </h2>
        <p class:section-paragraph>
          Same primitive, flipped to start alignment for a denser, less
          ceremonial CTA.
        </p>
        <div data-cta>
          <a class:unset class:x-button data-size="3" data-variant="solid" href="#">
            Get in touch
          </a>
        </div>
      </div>
    ) as Node,
};
