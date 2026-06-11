import type { Decorator } from "@storybook/html-vite";

/**
 * Theme-level controls shared by every story. Applied to <html> — the
 * styles layer (radius.css, scaling.css, accent/*, neutral/*) reads these
 * data attributes from any ancestor. Palettes/scales offered here must be
 * imported in preview.ts.
 */

export interface ThemeArgs {
  radius: "none" | "small" | "medium" | "large" | "pill";
  scaling: "xs" | "sm" | "md" | "lg" | "xl";
  accent: "neutral" | "mint" | "blue" | "crimson" | "iris" | "amber";
  neutral: "gray" | "slate" | "sand" | "mauve";
  "material-background": "translucent" | "solid";
}

const category = { table: { category: "Theme" } };

export const themeArgTypes = {
  radius: {
    control: "select",
    options: ["none", "small", "medium", "large", "pill"],
    ...category,
  },
  scaling: {
    control: "select",
    options: ["xs", "sm", "md", "lg", "xl"],
    ...category,
  },
  accent: {
    control: "select",
    options: ["mint", "neutral", "blue", "crimson", "iris", "amber"],
    ...category,
  },
  neutral: {
    control: "select",
    options: ["gray", "slate", "sand", "mauve"],
    ...category,
  },
  "material-background": {
    control: "select",
    options: ["translucent", "solid"],
    ...category,
  },
} as const;

export const themeArgs: ThemeArgs = {
  radius: "medium",
  scaling: "md",
  accent: "mint",
  neutral: "gray",
  "material-background": "translucent",
};

export const withThemeArgs: Decorator = (story, context) => {
  const html = document.documentElement;
  const args = context.args as Partial<ThemeArgs>;
  html.dataset.radius = args.radius ?? themeArgs.radius;
  html.dataset.scaling = args.scaling ?? themeArgs.scaling;
  html.dataset.accent = args.accent ?? themeArgs.accent;
  html.dataset.neutral = args.neutral ?? themeArgs.neutral;
  html.dataset.materialBackground =
    args["material-background"] ?? themeArgs["material-background"];
  return story();
};
