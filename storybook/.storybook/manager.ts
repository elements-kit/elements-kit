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
  sidebar: {
    // Badge sidebar entries tagged `experimental` (e.g. overlay) so their
    // not-production-ready status reads at a glance.
    renderLabel: (item) =>
      item.tags?.includes("experimental")
        ? createElement(
            "span",
            { style: { display: "inline-flex", alignItems: "center", gap: 6 } },
            item.name,
            createElement(
              "span",
              {
                style: {
                  fontSize: 9,
                  fontWeight: 700,
                  lineHeight: "14px",
                  padding: "0 5px",
                  borderRadius: 4,
                  background: "#f0b429",
                  color: "#3b2a00",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                },
              },
              "Exp",
            ),
          )
        : item.name,
  },
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
