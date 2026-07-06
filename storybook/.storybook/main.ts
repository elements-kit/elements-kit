import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/html-vite";

const src = fileURLToPath(new URL("../../src", import.meta.url));

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
