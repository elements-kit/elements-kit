import type { Meta, StoryObj } from "@storybook/html-vite";

import "./badge.css";

interface Args {
  label: string;
  variant: "solid" | "soft" | "surface" | "outline";
  size: "1" | "2" | "3";
}

const VARIANTS = ["solid", "soft", "surface", "outline"] as const;
const SIZES = ["1", "2", "3"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

const badge = (args: Args) => {
  const el = document.createElement("span");
  el.className = "unset x-badge";
  el.dataset.variant = args.variant;
  el.dataset.size = args.size;
  el.textContent = args.label;
  return el;
};

const meta = {
  title: "UI/Badge",
  argTypes: {
    label: { control: "text" },
    variant: {
      control: "select",
      options: ["solid", "soft", "surface", "outline"],
    },
    size: { control: "select", options: ["1", "2", "3"] },
  },
  args: { label: "Badge", variant: "solid", size: "2" },
  render: badge,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Solid: Story = {};
export const Soft: Story = { args: { variant: "soft" } };
export const Surface: Story = { args: { variant: "surface" } };
export const Outline: Story = { args: { variant: "outline" } };

// All sizes in one row for a quick scale check.
export const Sizes: Story = {
  render: (args) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.alignItems = "center";
    row.style.flexWrap = "wrap";
    for (const size of SIZES) {
      row.append(badge({ ...args, size, label: `Size ${size}` }));
    }
    return row;
  },
};

// Full grid: every variant across every size, plus an accent row showing
// each `data-accent` explicitly on a soft badge.
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
        row.append(badge({ ...args, variant, size, label: variant }));
      }
      wrap.append(row);
    }

    const accentRow = document.createElement("div");
    accentRow.style.display = "flex";
    accentRow.style.gap = "8px";
    accentRow.style.alignItems = "center";
    accentRow.style.flexWrap = "wrap";
    for (const accent of ACCENTS) {
      const el = badge({ ...args, variant: "soft", size: "2", label: accent });
      el.dataset.accent = accent;
      accentRow.append(el);
    }
    wrap.append(accentRow);

    return wrap;
  },
};
