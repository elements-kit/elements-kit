import type { Meta, StoryObj } from "@storybook/html-vite";

import "./link.css";

interface Args {
  label: string;
  underline: "auto" | "hover" | "always" | "none";
  disabled: boolean;
}

const UNDERLINES = ["auto", "hover", "always", "none"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

// `.x-link` is class-only — it styles a native <a>. Links can't use the native
// `disabled` attribute, so the disabled state is driven by `aria-disabled`.
const link = (args: Args) => {
  const a = document.createElement("a");
  a.className = "x-link";
  a.dataset.underline = args.underline;
  a.href = "#";
  if (args.disabled) a.setAttribute("aria-disabled", "true");
  a.textContent = args.label;
  return a;
};

const meta = {
  title: "UI/Link",
  argTypes: {
    label: { control: "text" },
    underline: {
      control: "select",
      options: ["auto", "hover", "always", "none"],
    },
    disabled: { control: "boolean" },
  },
  args: { label: "Read the docs", underline: "auto", disabled: false },
  render: link,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

// Inline link inside running text — underline appears on hover (default).
export const Inline: Story = {
  render: (args) => {
    const p = document.createElement("p");
    p.style.lineHeight = "1.6";
    p.append(
      document.createTextNode("Visit the "),
      link({ ...args, label: "documentation" }),
      document.createTextNode(" to get started."),
    );
    return p;
  },
};

// Standalone link with a permanent underline.
export const Standalone: Story = { args: { underline: "always" } };

export const HoverUnderline: Story = { args: { underline: "hover" } };
export const NoUnderline: Story = { args: { underline: "none" } };

// Disabled state — `aria-disabled="true"` on the anchor (links have no native
// `disabled`). A <button class="unset x-link" disabled> uses native disabled.
export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "16px";
    wrap.style.flexWrap = "wrap";

    wrap.append(link({ ...args, label: "Disabled anchor", disabled: true }));

    const btn = document.createElement("button");
    btn.className = "unset x-link";
    btn.type = "button";
    btn.disabled = true;
    btn.textContent = "Disabled button";
    wrap.append(btn);

    return wrap;
  },
};

// Full grid: every underline mode (each row labeled), plus an accent row where
// each cell sets `data-accent` explicitly with an always-on underline.
export const Gallery: Story = {
  render: (args) => {
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gap = "16px";

    const modes = document.createElement("div");
    modes.style.display = "grid";
    modes.style.gap = "10px";
    for (const underline of UNDERLINES) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "10px";
      row.style.alignItems = "center";
      const tag = document.createElement("code");
      tag.style.fontSize = "12px";
      tag.style.minWidth = "140px";
      tag.style.color = "var(--neutral-11)";
      tag.textContent = `data-underline="${underline}"`;
      row.append(tag, link({ ...args, underline, label: `the ${underline} link` }));
      modes.append(row);
    }
    wrap.append(modes);

    const accentRow = document.createElement("div");
    accentRow.style.display = "flex";
    accentRow.style.gap = "16px";
    accentRow.style.alignItems = "center";
    accentRow.style.flexWrap = "wrap";
    for (const accent of ACCENTS) {
      const el = link({ ...args, underline: "always", label: accent });
      el.dataset.accent = accent;
      accentRow.append(el);
    }
    wrap.append(accentRow);

    return wrap;
  },
};
