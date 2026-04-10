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
      expressiveCode: {
        themes: ["github-dark"],
      },
      title: "ElementsKit",
      description: "A signal-based reactive UI library for the web.",
      social: {
        github: "https://github.com/waelbettayeb/elements-kit",
      },
      sidebar: [
        { label: "Introduction", slug: "index" },
        { label: "Signals", slug: "signals" },
        { label: "Components", slug: "components" },
      ],
    }),
  ],
});
