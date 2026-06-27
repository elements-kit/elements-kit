import type { Meta, StoryObj } from "@storybook/html-vite";

import "./kbd.css";

interface Args {
  label: string;
  size: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
}

const SIZES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

const kbd = (key: string, size?: Args["size"]) => {
  const el = document.createElement("kbd");
  el.className = "unset x-kbd";
  if (size) el.dataset.size = size;
  el.textContent = key;
  return el;
};

const meta = {
  title: "UI/Kbd",
  argTypes: {
    label: { control: "text" },
    size: { control: "select", options: [...SIZES] },
  },
  args: { label: "K", size: "2" },
  render: (args) => kbd(args.label, args.size),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

// A single key.
export const Key: Story = {};

// A two-key combo (⌘ + K) — the canonical shortcut presentation.
export const Combo: Story = {
  render: (args) => {
    const span = document.createElement("span");
    span.append(kbd("⌘", args.size), document.createTextNode(" + "), kbd("K", args.size));
    return span;
  },
};

// The ⌘ + K combo rendered at every size.
export const Sizes: Story = {
  render: () => {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "8px";
    for (const size of SIZES) {
      const row = document.createElement("span");
      row.style.fontSize = `var(--font-size-${size})`;
      row.append(
        document.createTextNode("Press "),
        kbd("⌘", size),
        document.createTextNode(" + "),
        kbd("K", size),
        document.createTextNode(" to open"),
      );
      wrap.append(row);
    }
    return wrap;
  },
};

// Full grid: the ⌘ + K combo across every size, plus an accent row where each
// cell sets `data-accent` explicitly (kbd tints follow neutral, accent shown
// on the wrapper for parity with the other primitives).
export const Gallery: Story = {
  render: () => {
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gap = "16px";

    const sizeRow = document.createElement("div");
    sizeRow.style.display = "flex";
    sizeRow.style.gap = "12px";
    sizeRow.style.alignItems = "center";
    sizeRow.style.flexWrap = "wrap";
    for (const size of SIZES) {
      const cell = document.createElement("span");
      cell.append(kbd("⌘", size), document.createTextNode(" "), kbd("K", size));
      sizeRow.append(cell);
    }
    wrap.append(sizeRow);

    const accentRow = document.createElement("div");
    accentRow.style.display = "flex";
    accentRow.style.gap = "12px";
    accentRow.style.alignItems = "center";
    accentRow.style.flexWrap = "wrap";
    for (const accent of ACCENTS) {
      const cell = document.createElement("span");
      cell.dataset.accent = accent;
      cell.append(kbd("⌘", "3"), document.createTextNode(" "), kbd(accent[0].toUpperCase()));
      accentRow.append(cell);
    }
    wrap.append(accentRow);

    return wrap;
  },
};
