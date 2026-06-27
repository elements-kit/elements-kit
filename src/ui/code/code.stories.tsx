import type { Meta, StoryObj } from "@storybook/html-vite";

import "./code.css";

interface Args {
  label: string;
  variant: "soft" | "solid" | "outline" | "text";
  size: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
}

const VARIANTS = ["soft", "solid", "outline", "text"] as const;
const SIZES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

// `soft` is the default — only set `data-variant` when it differs.
const code = (args: Args) => {
  const el = document.createElement("code");
  el.className = "unset x-code";
  if (args.variant !== "soft") el.dataset.variant = args.variant;
  el.dataset.size = args.size;
  el.textContent = args.label;
  return el;
};

const meta = {
  title: "UI/Code",
  argTypes: {
    label: { control: "text" },
    variant: {
      control: "select",
      options: ["soft", "solid", "outline", "text"],
    },
    size: { control: "select", options: [...SIZES] },
  },
  args: { label: "npm install", variant: "soft", size: "2" },
  render: code,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

// Inline code span.
export const Inline: Story = {};

export const Soft: Story = { args: { variant: "soft" } };
export const Solid: Story = { args: { variant: "solid" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Text: Story = { args: { variant: "text" } };

// `.x-code` is inline by design — it flows inside running text.
export const InParagraph: Story = {
  render: (args) => {
    const p = document.createElement("p");
    p.style.lineHeight = "1.6";
    p.append(
      document.createTextNode("Run "),
      code({ ...args, label: "npm run dev" }),
      document.createTextNode(" to start the dev server, then push to "),
      code({ ...args, variant: "outline", label: "main" }),
      document.createTextNode(" to deploy."),
    );
    return p;
  },
};

// Full grid: every variant across every size, plus an accent row.
export const Gallery: Story = {
  render: (args) => {
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gap = "16px";

    for (const variant of VARIANTS) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "8px";
      row.style.alignItems = "center";
      row.style.flexWrap = "wrap";
      for (const size of SIZES) {
        row.append(code({ ...args, variant, size, label: `size-${size}` }));
      }
      wrap.append(row);
    }

    const accentRow = document.createElement("div");
    accentRow.style.display = "flex";
    accentRow.style.gap = "8px";
    accentRow.style.alignItems = "center";
    accentRow.style.flexWrap = "wrap";
    for (const accent of ACCENTS) {
      const el = code({ ...args, variant: "soft", size: "3", label: accent });
      el.dataset.accent = accent;
      accentRow.append(el);
    }
    wrap.append(accentRow);

    return wrap;
  },
};
