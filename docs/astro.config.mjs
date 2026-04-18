import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import {
  pluginMagicMove,
  magicMoveIntegration,
} from "./src/expressive-code/magicMove.ts";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [
    magicMoveIntegration(),
    react(),
    starlight({
      title: "ElementsKit",
      description: "Universal reactive primitives for the web.",

      social: {
        github: "https://github.com/waelbettayeb/elements-kit",
      },
      sidebar: [
        { label: "Introduction", slug: "index" },
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "getting-started/installation" },
            { label: "First component", slug: "getting-started/first-component" },
            { label: "Why ElementsKit", slug: "getting-started/why" },
          ],
        },
        {
          label: "Signals (Reference)",
          items: [
            { label: "Primitives", slug: "signals" },
            { label: "Stores", slug: "stores" },
            { label: "Promise", slug: "promise" },
            { label: "Async", slug: "async" },
          ],
        },
        {
          label: "Writing UI",
          items: [
            { label: "JSX & Elements", slug: "elements" },
            { label: "Components", slug: "components" },
            { label: "For (list rendering)", slug: "writing-ui/for" },
          ],
        },
        {
          label: "Custom Elements",
          items: [
            { label: "Overview", slug: "custom-elements" },
            { label: "Attributes", slug: "custom-elements/attributes" },
            { label: "Styling", slug: "custom-elements/styling" },
            { label: "Slots", slug: "custom-elements/slots" },
          ],
        },
        { label: "Utilities", slug: "utilities" },
        {
          label: "Integrations",
          items: [{ label: "React", slug: "integrations/react" }],
        },
        {
          label: "Recipes",
          items: [
            { label: "Data fetching", slug: "recipes/data-fetching" },
          ],
        },
      ],

      expressiveCode: {
        themes: ["github-light-default", "github-dark-default"],
        plugins: [pluginMagicMove()],
        styleOverrides: {
          borderRadius: "0.25rem",
          frames: {
            shadowColor: "#0000",
          },
        },
        useDarkModeMediaQuery: true,
      },
      customCss: ["./src/styles/custom.css"],
    }),
  ],
});
