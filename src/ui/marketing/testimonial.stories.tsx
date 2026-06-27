import type { Meta, StoryObj } from "@storybook/html-vite";

import "./marketing.css";
import "../card/card.css";

interface Args {
  variant: "surface" | "elevated" | "borderless";
}

const meta = {
  title: "Marketing/Testimonial",
  argTypes: {
    variant: {
      control: "select",
      options: ["surface", "elevated", "borderless"],
    },
  },
  args: { variant: "surface" },
  render: (args) =>
    (
      <figure
        class:x-card
        class:testimonial
        data-variant={args.variant === "surface" ? undefined : args.variant}
      >
        <blockquote>
          The kit <em>cut our design-to-ship loop in half</em>. Primitives
          compose cleanly, tokens stay consistent, and our team stopped
          re-inventing the same five layouts.
        </blockquote>
        <figcaption>
          <cite>Jane Doe</cite>
          <span data-title>Staff Engineer, Acme Co</span>
        </figcaption>
      </figure>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const Elevated: Story = {
  args: { variant: "elevated" },
  render: (args) =>
    (
      <figure class:x-card class:testimonial data-variant={args.variant}>
        <blockquote>
          We shipped a marketing site in a week.{" "}
          <em>The composition model just clicks.</em>
        </blockquote>
        <figcaption>
          <cite>Alex Kim</cite>
          <span data-title>Head of Design, Beta Inc</span>
        </figcaption>
      </figure>
    ) as Node,
};

export const Borderless: Story = {
  args: { variant: "borderless" },
  render: (args) =>
    (
      <figure class:x-card class:testimonial data-variant={args.variant}>
        <blockquote>
          Tokens flow through every primitive.{" "}
          <em>Theming once theme-d everything.</em>
        </blockquote>
        <figcaption>
          <cite>Sam Patel</cite>
          <span data-title>Engineering Lead, Gamma Labs</span>
        </figcaption>
      </figure>
    ) as Node,
};
