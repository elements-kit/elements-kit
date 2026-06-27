import type { Meta, StoryObj } from "@storybook/html-vite";

import "./accordion.css";

interface Args {
  variant: "surface" | "soft" | "borderless";
  size: "1" | "2" | "3";
  singleOpen: boolean;
  disabled: boolean;
}

const ITEMS = [
  [
    "How does it work?",
    "A native <details> styled via a single class. No JavaScript.",
  ],
  [
    "Is it accessible?",
    "Native disclosure semantics — keyboard and screen-reader support come from the browser.",
  ],
  [
    "Can I nest them?",
    "Yes. Nest a .x-accordion inside another item's content; the cascade just works.",
  ],
] as const;

const meta = {
  title: "UI/Accordion",
  argTypes: {
    variant: {
      control: "select",
      options: ["surface", "soft", "borderless"],
    },
    size: { control: "select", options: ["1", "2", "3"] },
    singleOpen: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: { variant: "surface", size: "2", singleOpen: true, disabled: false },
  render: (args) =>
    (
      <div>
        {ITEMS.map(([summary, body]) => (
          <details
            class:x-accordion
            data-variant={args.variant}
            data-size={args.size}
            name={args.singleOpen ? "faq" : undefined}
            aria-disabled={args.disabled ? "true" : undefined}
          >
            <summary>{summary}</summary>
            <p class:unset>{body}</p>
          </details>
        ))}
      </div>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Surface: Story = {};
export const Soft: Story = { args: { variant: "soft" } };
export const Borderless: Story = { args: { variant: "borderless" } };

export const Disabled: Story = { args: { disabled: true } };

export const Nested: Story = {
  render: (args) =>
    (
      <details
        class:x-accordion
        data-variant={args.variant}
        data-size={args.size}
        name="outer"
        open
      >
        <summary>Parent</summary>
        <details
          class:x-accordion
          data-variant={args.variant}
          data-size={args.size}
          name="inner"
          style="margin-block-start: 8px"
        >
          <summary>Child A</summary>
          <p>
            Single-open scopes per name — outer and inner groups are
            independent.
          </p>
        </details>
        <details
          class:x-accordion
          data-variant={args.variant}
          data-size={args.size}
          name="inner"
        >
          <summary>Child B</summary>
          <p>Opening this closes Child A.</p>
        </details>
      </details>
    ) as Node,
};

// The primitive ships no chevron — drop an SVG into <summary> and rotate it
// with your own `[open] > summary svg` rule.
export const WithChevron: Story = {
  render: (args) =>
    (
      <div>
        <style>
          {".x-accordion[open] > summary svg { transform: rotate(180deg); }"}
        </style>
        {ITEMS.map(([summary, body]) => (
          <details
            class:x-accordion
            data-variant={args.variant}
            data-size={args.size}
            name={args.singleOpen ? "faq" : undefined}
          >
            <summary>
              {summary}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                style="margin-inline-start: auto; flex-shrink: 0; transition: transform 200ms ease"
              >
                <path d="M4 6L8 10L12 6" />
              </svg>
            </summary>
            <p>{body}</p>
          </details>
        ))}
      </div>
    ) as Node,
};
