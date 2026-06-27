import type { Meta, StoryObj } from "@storybook/html-vite";

import "./marketing.css";
import "../button/button.css";

interface Args {
  align: "start" | "end" | "center" | "breakout";
  largeVisual: boolean;
}

function GradientVisual(props: {
  aspect?: string;
  width?: string;
  maxWidth?: string;
  bordered?: boolean;
}) {
  return (
    <div
      class:river-visual
      data-border={props.bordered ? "" : undefined}
      style:aspect-ratio={props.aspect ?? "4/3"}
      style:width={props.width ?? "auto"}
      style:max-width={props.maxWidth ?? "none"}
      style:background="linear-gradient(135deg, var(--mint-4), var(--mint-9))"
    />
  );
}

const meta = {
  title: "UI/River",
  argTypes: {
    align: {
      control: "select",
      options: ["start", "end", "center", "breakout"],
    },
    largeVisual: { control: "boolean" },
  },
  args: { align: "start", largeVisual: false },
  render: (args) =>
    (
      <div
        class:river
        data-align={args.align}
        data-large-visual={args.largeVisual ? "true" : undefined}
      >
        <div class:river-content>
          <h3 class:section-heading class:section-heading-3>
            Text on the left, visual on the right
          </h3>
          <p class:section-paragraph>
            Standard river. <em>6/6 split</em> at md+. Stacks below md.
          </p>
          <a class:unset class:x-button data-size="2" data-variant="text" href="#">
            Learn more
          </a>
        </div>
        <GradientVisual />
      </div>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
export const Start: Story = { args: { align: "start" } };

// Flipped via grid order. Alternate adjacent rivers start ↔ end for rhythm.
export const End: Story = {
  args: { align: "end" },
  render: () =>
    (
      <div class:river data-align="end">
        <div class:river-content>
          <h3 class:section-heading class:section-heading-3>
            Text on the right, visual on the left
          </h3>
          <p class:section-paragraph>
            Flipped via grid order. Alternate adjacent rivers between start ↔
            end for visual rhythm.
          </p>
          <a class:unset class:x-button data-size="2" data-variant="text" href="#">
            Learn more
          </a>
        </div>
        <GradientVisual />
      </div>
    ) as Node,
};

// Content and visual stack vertically with center justification.
export const Centered: Story = {
  args: { align: "center" },
  render: () =>
    (
      <div class:river data-align="center">
        <div class:river-content>
          <h3 class:section-heading class:section-heading-3>
            Centered, stacked column
          </h3>
          <p class:section-paragraph>
            Content and visual stack vertically with center justification.
          </p>
          <a class:unset class:x-button data-size="2" data-variant="text" href="#">
            Learn more
          </a>
        </div>
        <GradientVisual width="100%" maxWidth="640px" />
      </div>
    ) as Node,
};

// Split shifts to 5/7. Use when the visual carries the message.
export const LargeVisual: Story = {
  args: { align: "start", largeVisual: true },
  render: () =>
    (
      <div class:river data-align="start" data-large-visual="true">
        <div class:river-content>
          <h3 class:section-heading class:section-heading-3>
            Larger visual, narrower content
          </h3>
          <p class:section-paragraph>
            Split shifts to 5/7. Use when the visual carries the message.
          </p>
          <a class:unset class:x-button data-size="2" data-variant="text" href="#">
            Learn more
          </a>
        </div>
        <GradientVisual aspect="16/10" />
      </div>
    ) as Node,
};

// A large quote-style paragraph breaks out of the normal rhythm — bigger,
// looser, attention-grabbing. Heading is visually hidden.
export const Breakout: Story = {
  args: { align: "breakout" },
  render: () =>
    (
      <div class:river data-align="breakout">
        <h3
          class:section-heading
          style:position="absolute"
          style:width="1px"
          style:height="1px"
          style:overflow="hidden"
          style:clip="rect(0,0,0,0)"
        >
          Breakout
        </h3>
        <div class:river-content>
          <p class:section-paragraph>
            <em>A large quote-style paragraph</em> breaks out of the normal
            rhythm — bigger, looser, attention-grabbing.
          </p>
          <a
            class:unset
            class:x-button
            data-size="2"
            data-variant="text"
            data-cta=""
            href="#"
          >
            Learn more
          </a>
        </div>
        <GradientVisual aspect="21/9" />
      </div>
    ) as Node,
};

// `data-border` on the visual adds a 1px border + rounded corners + clipping.
// Use for screenshots and UI shots.
export const BorderedVisual: Story = {
  render: () =>
    (
      <div class:river>
        <div class:river-content>
          <h3 class:section-heading class:section-heading-3>
            Bordered visual
          </h3>
          <p class:section-paragraph>
            1px border + rounded corners + clipping. Use for screenshots and UI
            shots.
          </p>
        </div>
        <GradientVisual bordered />
      </div>
    ) as Node,
};
