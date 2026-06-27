import type { Meta, StoryObj } from "@storybook/html-vite";

import "./marketing.css";
import "../card/card.css";
import "../button/button.css";

interface Args {
  align: "start" | "center";
  card: boolean;
}

const CircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style="width: 2rem; height: 2rem">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

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
        <CircleIcon />
        <h4 data-heading>Composable</h4>
        <p data-paragraph>
          Class + data attributes only. No JS. Drop into any framework.
        </p>
        <a class:unset class:x-button data-size="2" data-variant="text" href="#">
          Learn more
        </a>
      </div>
    ) as Node,
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
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style="width: 2rem; height: 2rem"
        >
          <polygon points="12,2 22,20 2,20" />
        </svg>
        <h4 data-heading>Responsive</h4>
        <p data-paragraph>Mobile-first. No JS resize handlers.</p>
      </div>
    ) as Node,
};

// Pillars tile into any grid — three across here.
export const Grid: Story = {
  render: () =>
    (
      <div style="display: grid; gap: 32px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))">
        <div class:pillar>
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            style="width: 2rem; height: 2rem"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
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
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            style="width: 2rem; height: 2rem"
          >
            <rect x="4" y="4" width="16" height="16" rx="3" />
          </svg>
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
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            style="width: 2rem; height: 2rem"
          >
            <polygon points="12,2 22,20 2,20" />
          </svg>
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
    ) as Node,
};
