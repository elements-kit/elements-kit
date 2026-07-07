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
      // `.page-container` gutters + max-widths the section, like the docs page.
      <div class:page-container>
        <section class:hero data-align={args.align}>
          <h1 class:section-heading class:section-heading-1>
            Marketing layout
          </h1>
          <p class:section-paragraph>
            Compose pages from hero, sections, rivers, and pillars.
          </p>
          {/* `.hero` is a flex column (align-items: stretch), so the CTA must
              align-self to hug its text instead of stretching full-width. */}
          <a
            class:unset
            class:x-button
            data-size="3"
            data-variant="solid"
            href="#"
            style={`margin-top: 2rem; align-self: ${
              args.align === "center" ? "center" : "flex-start"
            }`}
          >
            Get started
          </a>
        </section>
      </div>
    ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
export const LeftAligned: Story = { args: { align: "start" } };
export const Centered: Story = { args: { align: "center" } };
