import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

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
