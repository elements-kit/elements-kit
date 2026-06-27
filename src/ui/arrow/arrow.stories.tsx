import type { Meta, StoryObj } from "@storybook/html-vite";

import "./arrow.css";
import "../button/button.css";

interface Args {
  size: string;
}

const SIZES = ["12px", "16px", "20px", "28px"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

// The arrow is a horizontal CTA chevron: drop `<span class="x-arrow">` as a
// DIRECT child of a link/button. On parent hover/focus the chevron slides and
// the shaft draws in — driven by the element's own `transform` / `clip-path`,
// so never set an inline `transform` here (it would override the animation).
// Size comes from `font-size`; color from `currentColor`; "left" is `dir="rtl"`.
function Arrow(size?: string) {
  return (
    <span
      class:x-arrow
      aria-hidden="true"
      style={size ? `font-size: ${size}` : undefined}
    />
  ) as Node;
}

const linkStyle =
  "color: var(--neutral-12); display: inline-flex; align-items: center; gap: 0.25em; width: fit-content";

const meta = {
  title: "UI/Arrow",
  argTypes: {
    size: { control: "select", options: [...SIZES] },
  },
  args: {
    size: "20px",
  },
  render: (args) =>
    (
      <a class:unset href="#" style={`${linkStyle}`}>
        Read the guide
        {Arrow()}
      </a>
    ) as Node,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

// Hover or focus the link — the chevron slides right and the shaft draws in.
export const Default: Story = {};

// Inside a solid CTA — same hover/focus animation against the button surface.
export const InButton: Story = {
  render: (args) =>
    (
      <a class:unset class:x-button data-variant="solid" data-size="2" href="#">
        Get started
        {Arrow()}
      </a>
    ) as Node,
};

export const Sizes: Story = {
  render: () =>
    (
      <div style="display: grid; gap: 12px">
        {SIZES.map((size) => (
          <a class:unset href="#" style={`${linkStyle}; font-size: ${size}`}>
            {size}
            {Arrow()}
          </a>
        ))}
      </div>
    ) as Node,
};

// `dir="rtl"` flips the arrow to point left (its only non-default direction).
export const Rtl: Story = {
  render: (args) =>
    (
      <a
        class:unset
        class:x-button
        data-variant="soft"
        data-size="2"
        href="#"
        dir="rtl"
      >
        اطلب عرضًا
        {Arrow()}
      </a>
    ) as Node,
};

export const Gallery: Story = {
  render: () =>
    (
      <div style="display: grid; gap: 24px; max-width: 560px">
        <div>
          <h3 style="margin: 0 0 12px">Sizes (via font-size)</h3>
          <div style="display: grid; gap: 12px">
            {SIZES.map((size) => (
              <a
                class:unset
                href="#"
                style={`${linkStyle}; font-size: ${size}`}
              >
                {size}
                {Arrow()}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 12px">Accents (via currentColor)</h3>
          <div style="display: grid; gap: 8px">
            {ACCENTS.map((accent) => (
              <a
                class:unset
                href="#"
                data-accent={accent}
                style="color: var(--accent-11); display: inline-flex; align-items: center; gap: 0.25em; width: fit-content"
              >
                {accent}
                {Arrow()}
              </a>
            ))}
          </div>
        </div>

        <div dir="rtl">
          <h3 style="margin: 0 0 12px; text-align: right">RTL (dir="rtl")</h3>
          <a
            class:unset
            class:x-button
            data-variant="soft"
            data-size="2"
            href="#"
          >
            اطلب عرضًا
            {Arrow()}
          </a>
        </div>
      </div>
    ) as Node,
};
