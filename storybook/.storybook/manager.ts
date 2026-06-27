import { createElement } from "react";
import { addons, types } from "storybook/manager-api";
import { create } from "storybook/theming";

const FIGMA_URL = "https://www.figma.com/community/file/1634497966964502610";

// Storybook auto-loads this file to theme the manager UI (sidebar, toolbar).
// `base` only themes the chrome — the light/dark *canvas* toggle is handled
// separately by addon-themes in preview.ts. With no `brandImage`, Storybook
// renders `brandTitle` as text.
addons.setConfig({
  theme: create({
    base: "dark",
    brandTitle: "🌱 ElementsKit",
    brandUrl: "https://github.com/elements-kit/elements-kit",
    brandTarget: "_self",
  }),
});

// Add a "Figma ↗" link to the toolbar — Storybook has no sidebar-link config,
// so an external link lives in the toolbar as a registered tool.
addons.register("elementskit/figma-link", () => {
  addons.add("elementskit/figma-link", {
    type: types.TOOL,
    title: "Figma",
    match: () => true,
    render: () =>
      createElement(
        "a",
        {
          href: FIGMA_URL,
          target: "_blank",
          rel: "noopener noreferrer",
          title: "Open the Figma design system",
          style: {
            display: "inline-flex",
            alignItems: "center",
            padding: "0 10px",
            height: "100%",
            fontSize: 12,
            fontWeight: 700,
            color: "inherit",
            textDecoration: "none",
          },
        },
        "Figma ↗",
      ),
  });
});
