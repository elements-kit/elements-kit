import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import elementsKit from "elements-kit/integrations/astro";
import starlightLlmsTxt from "starlight-llms-txt";
import {
  pluginMagicMove,
  magicMoveIntegration,
} from "./src/expressive-code/magicMove.ts";
import ecTwoSlash from "expressive-code-twoslash";
import ts from "typescript";
import { sidebar } from "./src/sidebar.ts";

const siteDescription =
  "Universal reactive primitives for the web — signals, JSX, custom elements, and browser-API helpers.";

export default defineConfig({
  site: "https://elements-kit.com",
  output: "server",
  adapter: cloudflare(),
  vite: {
    resolve: {
      // Workspace packages (`elements-kit/integrations/react`) and the docs
      // both import React. Without dedupe, Vite pre-bundles separate copies
      // — useSyncExternalStore lands on a different React than render runs
      // on, producing `resolveDispatcher() is null` and cascading
      // `jsxDEV is not a function` failures in dev.
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "shiki",
        "shiki-magic-move/core",
        "shiki-magic-move/renderer",
      ],
    },
  },
  integrations: [
    magicMoveIntegration(),
    elementsKit(),
    // Scope the React babel transform to the playground (its only consumer)
    // so every other .tsx falls through to esbuild with the elements-kit
    // jsx import source set by elementsKit().
    react({ include: ["**/src/playground/**"] }),
    sitemap(),
    starlight({
      title: "ElementsKit",
      description: siteDescription,
      // rawContent: the llms-txt container has no framework renderers, so
      // rendering MDX that embeds islands (e.g. the Astro-integration demo)
      // fails — raw Markdown is emitted instead.
      plugins: [starlightLlmsTxt({ rawContent: true })],
      favicon: "/favicon.svg",
      components: {
        SiteTitle: "./src/components/SiteTitle.astro",
        Sidebar: "./src/components/Sidebar.astro",
      },
      head: [
        {
          tag: "meta",
          attrs: { name: "twitter:card", content: "summary_large_image" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:title", content: "ElementsKit" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:description", content: siteDescription },
        },
        {
          tag: "meta",
          attrs: { property: "og:image", content: "/og.svg" },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:alt", content: "ElementsKit" },
        },
        {
          tag: "meta",
          attrs: { property: "og:site_name", content: "ElementsKit" },
        },
        {
          tag: "meta",
          attrs: { property: "og:locale", content: "en_US" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:image", content: "/og.svg" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:image:alt", content: "ElementsKit" },
        },
        {
          tag: "meta",
          attrs: { name: "theme-color", content: "#007d58" },
        },
        {
          tag: "meta",
          attrs: {
            name: "keywords",
            content:
              "signals, reactive, JSX, custom elements, web components, TypeScript, DOM, frontend, framework-agnostic, ElementsKit",
          },
        },
        {
          tag: "meta",
          attrs: { name: "author", content: "Wael Bettayeb" },
        },
        {
          tag: "link",
          attrs: {
            rel: "sitemap",
            type: "application/xml",
            href: "/sitemap-index.xml",
          },
        },
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareSourceCode",
            name: "ElementsKit",
            description: siteDescription,
            codeRepository: "https://github.com/elements-kit/elements-kit",
            programmingLanguage: "TypeScript",
            license: "https://opensource.org/licenses/MIT",
            author: {
              "@type": "Person",
              name: "Wael Bettayeb",
              url: "https://github.com/waelbettayeb",
            },
            url: "https://elements-kit.com",
          }),
        },
      ],

      social: {
        github: "https://github.com/elements-kit/elements-kit",
        twitter: "https://x.com/ElementsKit",
      },
      sidebar,

      expressiveCode: {
        themes: ["github-light-default", "github-dark-default"],
        plugins: [
          ecTwoSlash({
            twoslashOptions: {
              compilerOptions: {
                jsx: ts.JsxEmit.ReactJSX,
                jsxImportSource: "elements-kit",
                target: ts.ScriptTarget.ESNext,
                module: ts.ModuleKind.ESNext,
                moduleResolution: ts.ModuleResolutionKind.Bundler,
                strict: true,
                experimentalDecorators: true,
              },
            },
          }),
          pluginMagicMove(),
        ],
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
