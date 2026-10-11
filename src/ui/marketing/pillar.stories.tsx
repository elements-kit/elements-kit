import { StoryIcon } from "../../../storybook/icon";
import type { Meta, StoryObj } from "@storybook/html-vite";

import "./marketing.css";
import "../card/card.css";
import "../button/button.css";

interface Args {
  align: "start" | "center";
  card: boolean;
}

const ComposableIcon = () => <StoryIcon name="widgets" size="2rem" />;

const meta = {
  title: "Marketing/Pillar",
  argTypes: {
    align: { control: "inline-radio", options: ["start", "center"] },
    card: { control: "boolean" },
  },
  args: { align: "start", card: false },
  render: (args) =>
    (
      <div
        class:x-card={args.card}
        class:pillar
        data-align={args.align === "center" ? "center" : undefined}
      >
        <ComposableIcon />
        <h4 data-heading>Composable</h4>
        <p data-paragraph>
          Class + data attributes only. No JS. Drop into any framework.
        </p>
        <a class:unset class:x-button data-size="2" data-variant="text" href="#">
          Learn more
        </a>
      </div>
    ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

// Composed with .x-card for a bordered mini-card.
export const Card: Story = { args: { card: true } };

export const Center: Story = {
  args: { align: "center" },
  render: (args) =>
    (
      <div
        class:x-card={args.card}
        class:pillar
        data-align="center"
      >
        <StoryIcon name="devices" size="2rem" />
        <h4 data-heading>Responsive</h4>
        <p data-paragraph>Mobile-first. No JS resize handlers.</p>
      </div>
    ),
};

// Pillars tile into any grid — three across here.
export const Grid: Story = {
  render: () =>
    (
      <div style="display: grid; gap: 32px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))">
        <div class:pillar>
          <StoryIcon name="widgets" size="2rem" />
          <h4 data-heading>Composable</h4>
          <p data-paragraph>Class + data attributes only. No JS.</p>
          <a
            class:unset
            class:x-button
            data-size="2"
            data-variant="text"
            href="#"
          >
            Learn more
          </a>
        </div>
        <div class:pillar>
          <StoryIcon name="palette" size="2rem" />
          <h4 data-heading>Themeable</h4>
          <p data-paragraph>Tokens flow through every variant.</p>
          <a
            class:unset
            class:x-button
            data-size="2"
            data-variant="text"
            href="#"
          >
            Learn more
          </a>
        </div>
        <div class:pillar>
          <StoryIcon name="devices" size="2rem" />
          <h4 data-heading>Responsive</h4>
          <p data-paragraph>Mobile-first. No JS resize handlers.</p>
          <a
            class:unset
            class:x-button
            data-size="2"
            data-variant="text"
            href="#"
          >
            Learn more
          </a>
        </div>
      </div>
    ),
};
