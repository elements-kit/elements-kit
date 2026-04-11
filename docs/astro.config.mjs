import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [
    react(),
    starlight({
      title: "ElementsKit",
      description: "A signal-based reactive UI library for the web.",

      social: {
        github: "https://github.com/waelbettayeb/elements-kit",
      },
      sidebar: [
        { label: "Introduction", slug: "index" },
        {
          label: "Signals",
          items: [
            { label: "Primitives", slug: "signals" },
            { label: "Helpers", slug: "signals/helpers" },
          ],
        },
        {
          label: "Integrations",
          items: [
            { label: "React", slug: "integrations/react" },
          ],
        },
        { label: "Components", slug: "components" },
      ],

      expressiveCode: {
        themes: ["github-light-default", "github-dark-default"],
        styleOverrides: {
          borderRadius: "0.25rem",
          frames: {
            shadowColor: "#0000",
          },
        },
        useDarkModeMediaQuery: true,
        frames: {},
      },
      customCss: ["./src/styles/custom.css"],
    }),
  ],
});
