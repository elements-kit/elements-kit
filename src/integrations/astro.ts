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
            // Pre-bundling would give the client entrypoint its own copy of
            // the runtime — the claim renderer flips in one copy while
            // components read the other, breaking hydration. Serve all
            // elements-kit subpaths unbundled so every import shares one
            // module instance.
            optimizeDeps: { exclude: ["elements-kit"] },
            resolve: { dedupe: ["elements-kit"] },
          },
        });
      },
    },
  };
}
