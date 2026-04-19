import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import starlightLlmsTxt from "starlight-llms-txt";
import {
  pluginMagicMove,
  magicMoveIntegration,
} from "./src/expressive-code/magicMove.ts";
import ecTwoSlash from "expressive-code-twoslash";
import ts from "typescript";

const siteDescription =
  "Universal reactive primitives for the web — signals, JSX, custom elements, and browser-API helpers.";

export default defineConfig({
  site: "https://elements-kit.quba.co",
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
      ],
    },
  },
  integrations: [
    magicMoveIntegration(),
    react(),
    starlight({
      title: "ElementsKit",
      description: siteDescription,
      plugins: [starlightLlmsTxt()],
      favicon: "/favicon.svg",
      components: {
        SiteTitle: "./src/components/SiteTitle.astro",
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
          attrs: { name: "twitter:image", content: "/og.svg" },
        },
        {
          tag: "meta",
          attrs: { name: "theme-color", content: "#007d58" },
        },
      ],

      social: {
        github: "https://github.com/waelbettayeb/elements-kit",
      },
      sidebar: [
        { label: "Introduction", slug: "index" },
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "getting-started/installation" },
            {
              label: "First component",
              slug: "getting-started/first-component",
            },
            { label: "Why ElementsKit", slug: "getting-started/why" },
          ],
        },
        {
          label: "Reactivity",
          items: [
            { label: "Signals", slug: "signals" },
            { label: "Stores", slug: "stores" },
            { label: "Promise", slug: "promise" },
            { label: "Async", slug: "async" },
            { label: "Scopes", slug: "scopes" },
          ],
        },
        {
          label: "Elements",
          items: [
            { label: "JSX & Elements", slug: "elements" },
            { label: "Components", slug: "components" },
            { label: "Lists", slug: "elements/for" },
            { label: "Types", slug: "elements/types" },
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
          items: [{ label: "Data fetching", slug: "recipes/data-fetching" }],
        },
      ],

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
