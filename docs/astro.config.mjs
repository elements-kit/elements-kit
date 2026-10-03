import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import fumadocsMdx from "fumadocs-mdx/vite";
import elementsKit from "elements-kit/integrations/astro";
import { fileURLToPath } from "node:url";

// Browser page chunks carry only what renders: the Markdown twin and search
// data are server-only exports (`.md` routes), so their values are dropped.
const SERVER_ONLY = new Set(["_markdown", "structuredData"]);
const clientPageExports = {
  name: "ek:client-page-exports",
  transform(code, id, options) {
    if (options?.ssr || !/\/content\/docs\/.*\.mdx\?collection=docs/.test(id)) return;
    const cuts = [];
    for (const node of this.parse(code).body) {
      const decl = node.type === "ExportNamedDeclaration" && node.declaration;
      for (const d of decl?.declarations ?? []) {
        if (SERVER_ONLY.has(d.id.name) && d.init) cuts.push(d.init);
      }
    }
    if (!cuts.length) return;
    let out = code;
    for (const { start, end } of cuts.sort((a, b) => b.start - a.start)) {
      out = out.slice(0, start) + "undefined" + out.slice(end);
    }
    return { code: out, map: null };
  },
};

// `#pages`: eager page modules on the server (sync render, full HTML), lazy
// per-page chunks in the browser. Keyed on the build side, not on package
// conditions — the Cloudflare and prerender environments match `browser` too.
const pages = {
  name: "ek:pages",
  enforce: "pre",
  resolveId(id, _importer, options) {
    if (id !== "#pages") return;
    const file = options?.ssr ? "pages.server.ts" : "pages.client.ts";
    return fileURLToPath(new URL(`./src/docs/${file}`, import.meta.url));
  },
};

export default defineConfig({
  site: "https://elements-kit.com",
  output: "server",
  session: false,
  // Slashless everywhere, as fumadocs builds page URLs: `stores.html` serves
  // `/stores` directly, and canonicals, sitemap and links agree.
  trailingSlash: "never",
  build: { format: "file" },
  adapter: cloudflare({ imageService: "compile" }),
  integrations: [
    elementsKit(),
    // React owns the docs shell and its components; every other .tsx (the
    // island demos) keeps the elements-kit jsx import source.
    react({ include: ["**/src/docs/**", "**/src/components/**"] }),
    sitemap({
      filter: (page) => !/\.(md|txt)$/.test(page),
    }),
  ],
  vite: {
    plugins: [
      pages,
      fumadocsMdx(undefined, { index: false }),
      clientPageExports,
      tailwindcss(),
    ],
    resolve: {
      // Workspace packages (`elements-kit/integrations/react`) and the docs
      // both import React. Without dedupe, Vite pre-bundles separate copies
      // — useSyncExternalStore lands on a different React than render runs
      // on, producing `resolveDispatcher() is null`.
      dedupe: ["react", "react-dom"],
    },
    ssr: {
      resolve: { dedupe: ["react", "react-dom"] },
    },
  },
});
