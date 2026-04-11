import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { pluginMagicMove } from "./src/expressive-code/magicMove.ts";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [
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
          label: "Signals",
          items: [
            { label: "Primitives", slug: "signals" },
            { label: "Stores", slug: "stores" },
            { label: "Helpers", slug: "signals/helpers" },
          ],
        },
        {
          label: "Building UI",
          items: [
            { label: "Elements", slug: "elements" },
            { label: "Components", slug: "components" },
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
        {
          label: "Integrations",
          items: [{ label: "React", slug: "integrations/react" }],
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
