import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/html-vite";
import { transform } from "esbuild";

const src = fileURLToPath(new URL("../../src", import.meta.url));

/** A decorator at the start of a (possibly indented) line. */
const DECORATOR = /^\s*@[A-Za-z_$]/m;

/**
 * Oxc (Vite's default transformer) passes standard (2023-11) decorators
 * through UNTRANSFORMED and browsers have no native support — `@reactive()`
 * fields surface as "illegal character U+0040" at import. Lower
 * decorator-bearing .ts files with esbuild before oxc sees them. Mirrors
 * the `lower-standard-decorators` plugin in vitest.config.ts.
 */
const lowerStandardDecorators = {
  name: "lower-standard-decorators",
  async transform(code: string, id: string) {
    if (!id.endsWith(".ts") || id.includes("node_modules")) return;
    if (!DECORATOR.test(code)) return;
    const out = await transform(code, {
      loader: "ts",
      target: "es2022",
      sourcemap: true,
    });
    return { code: out.code, map: out.map };
  },
};

const config: StorybookConfig = {
  stories: ["../../src/ui/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y"
  ],
  framework: "@storybook/html-vite",
  viteFinal: (cfg) => {
    // Relative base so the static build works under the docs site's
    // /storybook/ subpath on Cloudflare.
    cfg.base = "./";
    // Lower standard decorators (`@reactive()` fields) before oxc — the
    // same pre-transform vitest.config.ts applies.
    cfg.plugins = [lowerStandardDecorators, ...(cfg.plugins ?? [])];
    // Mirror the library's `@/*` tsconfig path alias — and resolve the
    // package specifiers to SOURCE too. Stories import feature modules
    // relatively (src graph) but signals/JSX via "elements-kit/*" (dist
    // graph by default): two lib instances, so a signal or scope from
    // one can't track / clean up through the other. One graph fixes
    // that class of bug for good.
    cfg.resolve = {
      ...cfg.resolve,
      alias: {
        ...cfg.resolve?.alias,
        "elements-kit/signals": `${src}/signals/index.ts`,
        "elements-kit/jsx-runtime": `${src}/jsx-runtime/index.ts`,
        "elements-kit/jsx-dev-runtime": `${src}/jsx-runtime/index.ts`,
        "elements-kit/ui/overlay": `${src}/ui/overlay/index.ts`,
        "@": src,
      },
    };
    // Stories live outside this package (../../src/ui) — make sure Vite's
    // dev-server file allowlist covers the workspace root.
    cfg.server = {
      ...cfg.server,
      fs: { ...cfg.server?.fs, allow: ["../.."] },
    };
    return cfg;
  },
};

export default config;
