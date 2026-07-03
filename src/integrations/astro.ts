// Structural types for the Astro integration contract (astro 5.x). Typed
// locally so elements-kit takes no dependency on the astro package — the
// shapes are validated against astro's published .d.ts in tests and by the
// docs site build.

interface AstroRendererConfig {
  name: string;
  clientEntrypoint: string;
  serverEntrypoint: string;
}

interface AstroConfigSetupApi {
  addRenderer(renderer: AstroRendererConfig): void;
  updateConfig(config: Record<string, unknown>): unknown;
}

export interface ElementsKitAstroIntegration {
  name: string;
  hooks: {
    "astro:config:setup": (api: AstroConfigSetupApi) => void;
  };
}

/**
 * Astro integration: use elements-kit components as Astro islands.
 *
 * Registers the elements-kit renderer pair — server rendering via
 * `elements-kit/server`, client hydration via `elements-kit/hydrate` — and
 * points Vite's JSX transform at `elements-kit`, so `.tsx` island components
 * need no per-file pragma.
 *
 * ```tsx
 * <Counter client:load />          // server-rendered, hydrated on load
 * <Widget client:only="elements-kit" />  // client-rendered only
 * ```
 *
 * Coexists with other framework renderers (React, etc.); scope their JSX
 * transform with the framework integration's `include` option.
 *
 * @example
 * ```ts
 * // astro.config.mjs
 * import { defineConfig } from "astro/config";
 * import elementsKit from "elements-kit/integrations/astro";
 *
 * export default defineConfig({
 *   integrations: [elementsKit()],
 * });
 * ```
 */
export default function elementsKit(): ElementsKitAstroIntegration {
  return {
    name: "elements-kit",
    hooks: {
      "astro:config:setup": ({ addRenderer, updateConfig }) => {
        addRenderer({
          name: "elements-kit",
          clientEntrypoint: "elements-kit/integrations/astro-client",
          serverEntrypoint: "elements-kit/integrations/astro-server",
        });
        updateConfig({
          vite: {
            esbuild: { jsx: "automatic", jsxImportSource: "elements-kit" },
            // One runtime instance is non-negotiable: the reactive graph
            // cannot link across duplicate module copies (dead bindings).
            // Astro force-includes the renderer client entrypoint in
            // optimizeDeps (its include wins over exclude), so the only
            // single-graph strategy is to include every subpath too — the
            // optimizer then splits the runtime into chunks shared by the
            // entrypoint and all component imports. The glob covers deep
            // utility imports, which the scanner never auto-optimizes for
            // linked (workspace) packages.
            optimizeDeps: {
              include: [
                "elements-kit",
                "elements-kit/jsx-runtime",
                "elements-kit/jsx-dev-runtime",
                "elements-kit/signals",
                "elements-kit/for",
                "elements-kit/slot",
                "elements-kit/render",
                "elements-kit/hydrate",
                "elements-kit/await",
                "elements-kit/custom-elements",
                "elements-kit/attributes",
                "elements-kit/integrations/astro-client",
                "elements-kit/utilities/*",
              ],
            },
            resolve: { dedupe: ["elements-kit"] },
          },
        });
      },
    },
  };
}
