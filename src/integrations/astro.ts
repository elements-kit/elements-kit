// Structural types for the Astro integration contract (astro 5.x). Typed
// locally so elements-kit takes no dependency on the astro package — the
// shapes are validated against astro's published .d.ts in tests and by the
// docs site build.

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import elementsKitHmr from "./vite";

interface AstroRendererConfig {
  name: string;
  clientEntrypoint: string;
  serverEntrypoint: string;
}

interface AstroConfigSetupApi {
  addRenderer(renderer: AstroRendererConfig): void;
  updateConfig(config: Record<string, unknown>): unknown;
  // Astro's AstroConfig, narrowed at runtime — typing it structurally here
  // would pin a shape astro is free to change.
  config?: unknown;
}

export interface ElementsKitAstroIntegration {
  name: string;
  hooks: {
    "astro:config:setup": (api: AstroConfigSetupApi) => void;
  };
}

/**
 * The JSX transform config, under the key the installed Vite actually reads.
 *
 * Vite 8 (and rolldown-vite) transform with Oxc: `esbuild` options are ignored
 * there, and setting both keys warns. Older Vite only understands `esbuild`.
 * Vite is resolved from the project root — under isolated installs it is not
 * reachable from this package's own directory.
 */
function jsxTransformConfig(root?: unknown): Record<string, unknown> {
  const from =
    root instanceof URL
      ? fileURLToPath(root)
      : typeof root === "string"
        ? root
        : process.cwd();
  let oxc = false;
  try {
    const vite = createRequire(path.join(from, "noop.js"))(
      "vite/package.json",
    ) as { name?: string; version?: string };
    oxc =
      vite.name === "rolldown-vite" ||
      Number.parseInt(vite.version ?? "", 10) >= 8;
  } catch {
    // Vite unresolvable from the root — keep the pre-Oxc key.
  }
  return oxc
    ? { oxc: { jsx: { runtime: "automatic", importSource: "elements-kit" } } }
    : { esbuild: { jsx: "automatic", jsxImportSource: "elements-kit" } };
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
 * In dev it also installs an HMR plugin: editing an island component swaps it
 * in place instead of reloading the page. The island re-mounts, so its state
 * resets — hoist anything that must survive into a module the edit doesn't
 * invalidate.
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
      "astro:config:setup": ({ addRenderer, updateConfig, config }) => {
        addRenderer({
          name: "elements-kit",
          clientEntrypoint: "elements-kit/integrations/astro-client",
          serverEntrypoint: "elements-kit/integrations/astro-server",
        });
        updateConfig({
          vite: {
            ...jsxTransformConfig((config as { root?: unknown } | undefined)?.root),
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
                // Dev-only, but it must join the same optimizer graph as
                // everything else — the registry re-mounts islands through
                // `render`, which has to be the runtime instance the islands
                // were built with.
                "elements-kit/integrations/hmr-runtime",
                "elements-kit/utilities/*",
              ],
            },
            resolve: { dedupe: ["elements-kit"] },
            // Dev-only (`apply: "serve"`): gives component modules an HMR
            // accept boundary so an edit swaps the island instead of
            // reloading the page.
            plugins: [elementsKitHmr()],
          },
        });
      },
    },
  };
}
